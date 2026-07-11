import asyncio
import os
from dataclasses import asdict
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel

from app.deps import require_admin
from app.settings import ModuleConfig, new_module_id, write_settings
from app.state import get_settings

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


class DiscoveredModule(BaseModel):
    source_url: str
    name: Optional[str] = None
    scope: Optional[str] = None
    component: Optional[str] = None
    route: Optional[str] = None
    icon: Optional[str] = None
    roles: Optional[list[str]] = None
    description: Optional[str] = None
    remote_url: Optional[str] = None
    already_registered: bool = False
    error: Optional[str] = None


@router.get("")
async def get_settings_route(authorization: str = Header(default="")):
    require_admin(authorization)
    return asdict(get_settings())


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


@router.get("/modules/discover")
async def discover_modules(authorization: str = Header(default="")):
    require_admin(authorization)
    raw = os.getenv("MODULE_REGISTRY_URLS", "").strip()
    if not raw:
        return []
    base_urls = [u.strip().rstrip("/") for u in raw.split(",") if u.strip()]
    registered_scopes = {m.scope for m in get_settings().modules}

    async def fetch_one(base_url: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{base_url}/manifest.json")
                resp.raise_for_status()
                m = resp.json()
            scope = m.get("scope")
            return DiscoveredModule(
                source_url=base_url,
                name=m.get("name"),
                scope=scope,
                component=m.get("component"),
                route=m.get("route"),
                icon=m.get("icon"),
                roles=m.get("roles"),
                description=m.get("description"),
                remote_url=m.get("remote_entry") or f"{base_url}/remoteEntry.js",
                already_registered=bool(scope and scope in registered_scopes),
            ).model_dump()
        except Exception as exc:
            return DiscoveredModule(source_url=base_url, error=str(exc)).model_dump()

    return await asyncio.gather(*[fetch_one(u) for u in base_urls])
