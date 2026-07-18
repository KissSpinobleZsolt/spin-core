from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_pg, get_ch
from app.deps import token_dep, admin_dep
from app.events import LogLevel, BotEvent, lifecycle_message
from app.routes.bots.schemas import BotPayload, BotOut

router = APIRouter(prefix="/api/bots", tags=["bots"])


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
    ch = get_ch()
    ch.write_bot_log(
        bot.name, admin_email, BotEvent.INIT,
        {"bot_id": bot.id},
        level=LogLevel.INFO,
        name=bot.name,
        message=lifecycle_message(BotEvent.INIT, bot.name),
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
def update_bot(bot_id: str, payload: BotPayload, email: str = Depends(admin_dep)):
    """Replace a bot's full configuration by ID (admin only)."""
    pg = get_pg()
    # Read before update to detect active↔inactive transition and emit the right event (ACTIVATE/DEACTIVATE vs UPDATE)
    old = pg.get_bot_by_id(bot_id)
    if not old:
        raise HTTPException(status_code=404, detail="Bot not found")
    bot = pg.update_bot(
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
    if payload.active and not old.active:
        event = BotEvent.ACTIVATE
    elif not payload.active and old.active:
        event = BotEvent.DEACTIVATE
    else:
        event = BotEvent.UPDATE
    get_ch().write_bot_log(
        bot.name, email, event,
        {"bot_id": bot_id},
        level=LogLevel.INFO,
        name=bot.name,
        message=lifecycle_message(event, bot.name),
    )
    return BotOut(**bot.__dict__)


@router.delete("/{bot_id}", status_code=204)
def delete_bot(bot_id: str, email: str = Depends(admin_dep)):
    """Permanently delete a bot by ID (admin only)."""
    pg = get_pg()
    # Read before delete — bot name is needed for the log entry and is unreachable after deletion
    bot = pg.get_bot_by_id(bot_id)
    if not bot or not pg.delete_bot(bot_id):
        raise HTTPException(status_code=404, detail="Bot not found")
    get_ch().write_bot_log(
        bot.name, email, BotEvent.DELETE,
        {"bot_id": bot_id},
        level=LogLevel.INFO,
        name=bot.name,
        message=lifecycle_message(BotEvent.DELETE, bot.name),
    )
