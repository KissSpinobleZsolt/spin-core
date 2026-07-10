from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import hash_password
from app.database import get_pg
from app.settings import AppSettings, ModuleConfig, ThemeConfig, new_module_id, write_settings
from app.state import get_settings, set_settings

router = APIRouter(prefix="/api/setup", tags=["setup"])


class ModuleInput(BaseModel):
    name: str
    remote_url: str
    scope: str
    component: str
    route: str
    icon: str = "🧩"
    enabled: bool = True
    roles: list[str] = ["user", "admin"]


class SetupPayload(BaseModel):
    admin_name: str
    admin_email: str
    admin_password: str
    default_theme: Literal["dark", "light"] = "dark"
    modules: list[ModuleInput] = []


@router.get("/status")
async def setup_status():
    return {"setup_complete": get_settings().setup_complete}


@router.post("/complete", status_code=201)
async def complete_setup(payload: SetupPayload):
    if get_settings().setup_complete:
        raise HTTPException(status_code=409, detail="Setup already completed")

    pg = get_pg()
    pg.create_user(
        email=payload.admin_email,
        name=payload.admin_name,
        hashed_password=hash_password(payload.admin_password),
        roles=["user", "admin"],
        default_theme=payload.default_theme,
    )
    pg.upsert_page("dashboard", "Hello welcome")

    modules = [ModuleConfig(id=new_module_id(), **m.model_dump()) for m in payload.modules]
    new_settings = AppSettings(
        setup_complete=True,
        theme=ThemeConfig(default_theme=payload.default_theme),
        modules=modules,
    )
    write_settings(new_settings)
    set_settings(new_settings)
    return {"status": "ok"}
