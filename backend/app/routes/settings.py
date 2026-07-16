import asyncio
import os
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.database import get_ch, get_pg
from app.deps import admin_dep
from app.schemas import ModuleInput
from app.settings import write_settings
from app.state import get_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ThemePayload(BaseModel):
    """Request body schema for updating the platform default theme."""

    theme: Literal["dark", "light"]


class DiscoveredModule(BaseModel):
    """Metadata returned when probing a remote module registry URL."""

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
async def get_settings_route(_: str = Depends(admin_dep)):
    """Return the current platform-level settings (theme only)."""
    s = get_settings()
    return {"theme": {"default_theme": s.theme.default_theme}}


@router.patch("/theme", status_code=204)
async def update_theme(payload: ThemePayload, _: str = Depends(admin_dep)):
    """Update the platform default theme and persist it to settings.json (admin only)."""
    s = get_settings()
    s.theme.default_theme = payload.theme
    write_settings(s)
    return Response(status_code=204)


@router.get("/modules")
async def list_modules(_: str = Depends(admin_dep)):
    """Return all registered micro-frontend modules (admin only)."""
    return get_pg().get_modules()


@router.post("/modules", status_code=201)
async def create_module(payload: ModuleInput, email: str = Depends(admin_dep)):
    """Register a new module, provision its ClickHouse tables, and seed bots declared in its manifest (admin only)."""
    pg = get_pg()
    module = pg.create_module(payload.model_dump())
    ch = get_ch()
    ch.ensure_module_table(module["scope"])
    ch.ensure_module_mv(module["scope"])
    # Written outside the try/except — the module table is guaranteed to exist at this point;
    # bot logs are inside the try/except because they depend on a reachable manifest URL.
    ch.write_module_log(module["scope"], email, "module.registered", {
        "module_id": module["id"],
        "name": module["name"],
        "scope": module["scope"],
    })
    try:
        manifest_url = payload.remote_url.rsplit("/remoteEntry.js", 1)[0] + "/manifest.json"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(manifest_url)
            resp.raise_for_status()
            manifest = resp.json()
        bots_data = manifest.get("bots") or []
        new_bots = pg.seed_bots_for_module(module["id"], bots_data, created_by=email) if bots_data else []
        for bot in new_bots:
            ch.ensure_bot_table(bot.name)
            ch.ensure_bot_mv(bot.name)
            ch.write_bot_log(bot.name, email, "bot.registered", {
                "bot_id": bot.id,
                "bot_name": bot.name,
                "module_id": module["id"],
                "module_scope": module["scope"],
            })
        if not payload.backend_url and manifest.get("backend_url"):
            module = pg.update_module(module["id"], {"backend_url": manifest["backend_url"]}) or module
    except Exception:
        pass
    return module


@router.put("/modules/{module_id}")
async def update_module(module_id: str, payload: ModuleInput, _: str = Depends(admin_dep)):
    """Update the configuration of an existing module by ID (admin only)."""
    module = get_pg().update_module(module_id, payload.model_dump())
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return module


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(module_id: str, _: str = Depends(admin_dep)):
    """Permanently remove a registered module by ID (admin only)."""
    if not get_pg().delete_module(module_id):
        raise HTTPException(status_code=404, detail="Module not found")
    return Response(status_code=204)



@router.get("/modules/discover")
async def discover_modules(_: str = Depends(admin_dep)):
    """Probe MODULE_REGISTRY_URLS for available modules and report which are already registered."""
    raw = os.getenv("MODULE_REGISTRY_URLS", "").strip()
    if not raw:
        return []
    base_urls = [u.strip().rstrip("/") for u in raw.split(",") if u.strip()]
    registered_scopes = {m["scope"] for m in get_pg().get_modules()}

    async def fetch_one(base_url: str) -> dict | None:
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
                remote_url=m.get("remote_url") or m.get("remote_entry") or f"{base_url}/remoteEntry.js",
                already_registered=bool(scope and scope in registered_scopes),
            ).model_dump()
        except Exception:
            return None

    results = await asyncio.gather(*[fetch_one(u) for u in base_urls])
    return [r for r in results if r is not None]
