from dataclasses import asdict
from typing import Literal

from fastapi import APIRouter, Header, Response
from pydantic import BaseModel

from app.deps import require_admin
from app.settings import ModuleConfig, new_module_id, write_settings
from app.state import get_settings
from fastapi import HTTPException

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ThemePayload(BaseModel):
    theme: Literal["dark", "light"]


class ModuleInput(BaseModel):
    name: str
    remote_url: str
    scope: str
    component: str
    route: str
    icon: str = "🧩"
    enabled: bool = True
    roles: list[str] = ["user", "admin"]


@router.get("")
async def get_settings_route(authorization: str = Header(default="")):
    require_admin(authorization)
    data = asdict(get_settings())
    data.pop("db_url", None)
    return data


@router.patch("/theme", status_code=204)
async def update_theme(payload: ThemePayload, authorization: str = Header(default="")):
    require_admin(authorization)
    s = get_settings()
    s.theme.default_theme = payload.theme
    write_settings(s)
    return Response(status_code=204)


@router.get("/modules")
async def list_modules(authorization: str = Header(default="")):
    require_admin(authorization)
    return [asdict(m) for m in get_settings().modules]


@router.post("/modules", status_code=201)
async def create_module(payload: ModuleInput, authorization: str = Header(default="")):
    require_admin(authorization)
    s = get_settings()
    module = ModuleConfig(id=new_module_id(), **payload.model_dump())
    s.modules.append(module)
    write_settings(s)
    return asdict(module)


@router.put("/modules/{module_id}")
async def update_module(module_id: str, payload: ModuleInput, authorization: str = Header(default="")):
    require_admin(authorization)
    s = get_settings()
    for i, m in enumerate(s.modules):
        if m.id == module_id:
            s.modules[i] = ModuleConfig(id=module_id, **payload.model_dump())
            write_settings(s)
            return asdict(s.modules[i])
    raise HTTPException(status_code=404, detail="Module not found")


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(module_id: str, authorization: str = Header(default="")):
    require_admin(authorization)
    s = get_settings()
    before = len(s.modules)
    s.modules = [m for m in s.modules if m.id != module_id]
    if len(s.modules) == before:
        raise HTTPException(status_code=404, detail="Module not found")
    write_settings(s)
    return Response(status_code=204)
