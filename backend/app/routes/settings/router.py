import asyncio
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response

from app.database import get_ch, get_pg
from app.deps import admin_dep
from app.events import LogLevel, ModuleEvent, lifecycle_message
from app.schemas import ModuleInput
from app.settings import write_settings
from app.state import get_settings
from app.routes.settings.schemas import ThemePayload, DiscoveredModule

router = APIRouter(prefix="/api/settings", tags=["settings"])


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
    ch.write_module_log(
        module["scope"], email, ModuleEvent.INIT,
        {"module_id": module["id"], "scope": module["scope"]},
        level=LogLevel.INFO,
        name=module["name"],
        message=lifecycle_message(ModuleEvent.INIT, module["name"]),
    )
    try:
        manifest_url = payload.remote_url.rsplit("/remoteEntry.js", 1)[0] + "/manifest.json"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(manifest_url)
            resp.raise_for_status()
            manifest = resp.json()
        bots_data = manifest.get("bots") or []
        new_bots = pg.seed_bots_for_module(module["id"], bots_data, created_by=email) if bots_data else []
        for bot in new_bots:
            from app.events import BotEvent
            ch.write_bot_log(
                bot.name, email, BotEvent.INIT,
                {"bot_id": bot.id, "module_id": module["id"], "module_scope": module["scope"]},
                level=LogLevel.INFO, name=bot.name,
                message=lifecycle_message(BotEvent.INIT, bot.name),
            )
        if not payload.backend_url and manifest.get("backend_url"):
            module = pg.update_module(module["id"], {"backend_url": manifest["backend_url"]}) or module
        i18n_data = manifest.get("i18n") or {}
        if i18n_data:
            updated_presets = {**module.get("presets", {}), "i18n": i18n_data}
            module = pg.update_module(module["id"], {"presets": updated_presets}) or module
            for lang, translations in i18n_data.items():
                pg.merge_i18n_data(lang, translations)
    except Exception:
        pass
    return module


@router.post("/modules/{module_id}/reset-i18n", status_code=204)
async def reset_module_i18n(module_id: str, _: str = Depends(admin_dep)):
    """Re-merge the i18n snapshot stored in module.presets.i18n back into the translations table (admin only)."""
    pg = get_pg()
    module = pg.get_module_by_id(module_id)
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    i18n = module.get("presets", {}).get("i18n", {})
    for lang, data in i18n.items():
        pg.merge_i18n_data(lang, data)
    return Response(status_code=204)


@router.put("/modules/{module_id}")
async def update_module(module_id: str, payload: ModuleInput, email: str = Depends(admin_dep)):
    """Update the configuration of an existing module by ID (admin only)."""
    pg = get_pg()
    old = pg.get_module_by_id(module_id)
    if old is None:
        raise HTTPException(status_code=404, detail="Module not found")
    module = pg.update_module(module_id, payload.model_dump())
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    ch = get_ch()
    if payload.enabled and not old["enabled"]:
        event = ModuleEvent.ACTIVATE
    elif not payload.enabled and old["enabled"]:
        event = ModuleEvent.DEACTIVATE
    else:
        event = ModuleEvent.UPDATE
    ch.write_module_log(
        module["scope"], email, event,
        {"module_id": module_id},
        level=LogLevel.INFO,
        name=module["name"],
        message=lifecycle_message(event, module["name"]),
    )
    return module


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(module_id: str, email: str = Depends(admin_dep)):
    """Permanently remove a registered module by ID (admin only)."""
    pg = get_pg()
    mod = pg.get_module_by_id(module_id)
    if not mod or not pg.delete_module(module_id):
        raise HTTPException(status_code=404, detail="Module not found")
    get_ch().write_module_log(
        mod["scope"], email, ModuleEvent.DELETE,
        {"module_id": module_id},
        level=LogLevel.INFO,
        name=mod["name"],
        message=lifecycle_message(ModuleEvent.DELETE, mod["name"]),
    )
    return Response(status_code=204)


@router.get("/modules/discover")
async def discover_modules(_: str = Depends(admin_dep)):
    """Probe MODULE_REGISTRY_URLS for available modules and report which are already registered."""
    raw = os.getenv("MODULE_REGISTRY_URLS", "").strip()
    if not raw:
        return []
    base_urls = [u.strip().rstrip("/") for u in raw.split(",") if u.strip()]
    all_modules = get_pg().get_modules(enabled_only=False)
    registered_scopes = {m["scope"] for m in all_modules}
    # Keyed by scope to let fetch_one attach id + enabled without a second DB round-trip.
    registered_scopes_full = {m["scope"]: m for m in all_modules}

    async def fetch_one(base_url: str) -> dict | None:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{base_url}/manifest.json")
                resp.raise_for_status()
                m = resp.json()
            scope = m.get("scope")
            already = bool(scope and scope in registered_scopes)
            existing = registered_scopes_full.get(scope) if already else None
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
                already_registered=already,
                module_id=existing["id"] if existing else None,
                enabled=existing["enabled"] if existing else None,
            ).model_dump()
        except Exception:
            return None

    results = await asyncio.gather(*[fetch_one(u) for u in base_urls])
    return [r for r in results if r is not None]
