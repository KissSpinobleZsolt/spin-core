from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.database import get_pg
from app.deps import token_dep, admin_dep

router = APIRouter(prefix="/api/bots", tags=["bots"])


class BotPayload(BaseModel):
    """Request body schema for creating or updating a bot.

    Attributes:
        provider: LLM backend to use — ``"ollama"`` (default), ``"anthropic"``,
            or ``"openai"``.  Determines which provider adapter the chat route
            selects at inference time.
        model: Provider-specific model identifier (e.g. ``"qwen2.5:7b"`` for Ollama,
            ``"claude-sonnet-5"`` for Anthropic).  Empty string uses the adapter
            default, which is the ``OLLAMA_MODEL`` / ``ANTHROPIC_DEFAULT_MODEL`` env var.
    """

    name: str
    description: str = ""
    type: str = "communicator"
    provider: str = "ollama"
    model: str = ""
    system_prompt: str = ""
    icon: str = "🤖"
    active: bool = False
    restricted: str = "user"
    modules: List[str] = []
    config_schema: dict = {}


class BotOut(BaseModel):
    """Response schema representing a single bot with its full configuration and metadata.

    Attributes:
        provider: LLM backend identifier stored on the bot — one of ``"ollama"``,
            ``"anthropic"``, or ``"openai"``.
        config_schema: Declarative UI schema for the bot's configuration page, sourced
            from the module manifest.  Empty dict for bots without a custom config UI.
    """

    id: str
    name: str
    description: str
    type: str
    provider: str
    model: str
    system_prompt: str
    icon: str
    active: bool
    restricted: str
    modules: List[str]
    created_by: str
    config_schema: dict = {}
    created_at: Optional[datetime] = None


@router.get("/types")
def list_bot_types(_: str = Depends(token_dep)):
    """Return all registered bot type definitions."""
    return get_pg().get_bot_types()


@router.get("", response_model=List[BotOut])
def list_bots(email: str = Depends(token_dep), module_id: Optional[str] = Query(default=None)):
    """Return bots visible to the authenticated user, optionally scoped to a specific module."""
    pg = get_pg()
    user = pg.get_user_by_email(email)
    user_roles = user.roles if user else []
    is_admin = "admin" in user_roles
    if module_id:
        bots = pg.get_bots_for_module(module_id, user_roles=user_roles)
    else:
        bots = pg.get_bots(admin=is_admin, user_roles=user_roles)
    return [BotOut(**b.__dict__) for b in bots]


@router.post("", response_model=BotOut, status_code=201)
def create_bot(payload: BotPayload, admin_email: str = Depends(admin_dep)):
    """Create a new bot with the provided configuration (admin only)."""
    bot = get_pg().create_bot(
        name=payload.name,
        description=payload.description,
        type=payload.type,
        provider=payload.provider,
        model=payload.model,
        system_prompt=payload.system_prompt,
        icon=payload.icon,
        active=payload.active,
        restricted=payload.restricted,
        modules=payload.modules,
        created_by=admin_email,
        config_schema=payload.config_schema,
    )
    return BotOut(**bot.__dict__)


@router.get("/{bot_id}", response_model=BotOut)
def get_bot(bot_id: str, email: str = Depends(token_dep)):
    """Return a single bot by ID, enforcing active status and role restrictions for non-admins."""
    pg = get_pg()
    bot = pg.get_bot_by_id(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    user = pg.get_user_by_email(email)
    user_roles = user.roles if user else []
    is_admin = "admin" in user_roles

    if not is_admin:
        if not bot.active:
            raise HTTPException(status_code=404, detail="Bot not found")
        if bot.restricted == "admin" and "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Access denied")

    return BotOut(**bot.__dict__)


@router.put("/{bot_id}", response_model=BotOut)
def update_bot(bot_id: str, payload: BotPayload, _: str = Depends(admin_dep)):
    """Replace a bot's full configuration by ID (admin only)."""
    bot = get_pg().update_bot(
        bot_id=bot_id,
        name=payload.name,
        description=payload.description,
        type=payload.type,
        provider=payload.provider,
        model=payload.model,
        system_prompt=payload.system_prompt,
        icon=payload.icon,
        active=payload.active,
        restricted=payload.restricted,
        modules=payload.modules,
        config_schema=payload.config_schema,
    )
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return BotOut(**bot.__dict__)


@router.delete("/{bot_id}", status_code=204)
def delete_bot(bot_id: str, _: str = Depends(admin_dep)):
    """Permanently delete a bot by ID (admin only)."""
    if not get_pg().delete_bot(bot_id):
        raise HTTPException(status_code=404, detail="Bot not found")
