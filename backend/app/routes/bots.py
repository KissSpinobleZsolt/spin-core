from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.database import get_pg
from app.deps import token_dep, admin_dep

router = APIRouter(prefix="/api/bots", tags=["bots"])


class BotPayload(BaseModel):
    name: str
    description: str = ""
    type: str = "communicator"
    model: str = ""
    system_prompt: str = ""
    icon: str = "🤖"
    active: bool = False
    restricted: str = "user"
    modules: List[str] = []


class BotOut(BaseModel):
    id: str
    name: str
    description: str
    type: str
    model: str
    system_prompt: str
    icon: str
    active: bool
    restricted: str
    modules: List[str]
    created_by: str
    created_at: Optional[datetime] = None


@router.get("/types")
def list_bot_types(_: str = Depends(token_dep)):
    return get_pg().get_bot_types()


@router.get("", response_model=List[BotOut])
def list_bots(email: str = Depends(token_dep), module_id: Optional[str] = Query(default=None)):
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
    bot = get_pg().create_bot(
        name=payload.name,
        description=payload.description,
        type=payload.type,
        model=payload.model,
        system_prompt=payload.system_prompt,
        icon=payload.icon,
        active=payload.active,
        restricted=payload.restricted,
        modules=payload.modules,
        created_by=admin_email,
    )
    return BotOut(**bot.__dict__)


@router.get("/{bot_id}", response_model=BotOut)
def get_bot(bot_id: str, email: str = Depends(token_dep)):
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
    bot = get_pg().update_bot(
        bot_id=bot_id,
        name=payload.name,
        description=payload.description,
        type=payload.type,
        model=payload.model,
        system_prompt=payload.system_prompt,
        icon=payload.icon,
        active=payload.active,
        restricted=payload.restricted,
        modules=payload.modules,
    )
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return BotOut(**bot.__dict__)


@router.delete("/{bot_id}", status_code=204)
def delete_bot(bot_id: str, _: str = Depends(admin_dep)):
    if not get_pg().delete_bot(bot_id):
        raise HTTPException(status_code=404, detail="Bot not found")
