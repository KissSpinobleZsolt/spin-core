import asyncio
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response

from app.database import get_pg, get_logger
from app.deps import admin_dep
from app.events import ModuleEvent, BotEvent
from app.schemas import ModuleInput
from app.settings import write_settings
from app.state import get_settings
from app.routes.settings.schemas import ThemePayload, DiscoveredModule

router = APIRouter(prefix="/api/settings", tags=["settings"])  # mounts platform configuration endpoints under /api/settings


@router.patch("/theme", status_code=204)
async def update_theme(payload: ThemePayload, _: str = Depends(admin_dep)):
    """Update the platform default theme and persist it to settings.json (admin only)."""
    s = get_settings()                      # get the live in-process settings singleton
    s.theme.default_theme = payload.theme   # mutate the theme on the singleton
    write_settings(s)                       # persist the change to settings.json on disk
    return Response(status_code=204)        # 204 No Content; no body needed


@router.get("/modules")
async def list_modules(_: str = Depends(admin_dep)):
    """Return all registered micro-frontend modules (admin only)."""
    return get_pg().get_modules()  # returns all modules regardless of enabled flag for the admin view


@router.post("/modules", status_code=201)
async def create_module(payload: ModuleInput, email: str = Depends(admin_dep)):
    """Register a new module, provision its ClickHouse tables, and seed bots declared in its manifest (admin only)."""
    pg = get_pg()
    module = pg.create_module(payload.model_dump())  # insert the module row and get the full dict back
    get_logger().module(  # log the registration event immediately after the row is created
        ModuleEvent.INIT, module["scope"], module["name"], email,
        {"module_id": module["id"], "scope": module["scope"]},
    )
    try:
        manifest_url = payload.remote_url.rsplit("/remoteEntry.js", 1)[0] + "/manifest.json"  # derive the manifest URL from the federation entry point
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(manifest_url)  # probe the module's manifest endpoint
            resp.raise_for_status()
            manifest = resp.json()
        bots_data = manifest.get("bots") or []  # optional bots section in the manifest
        new_bots = pg.seed_bots_for_module(module["id"], bots_data, created_by=email) if bots_data else []  # provision declared bots, skipping duplicates
        for bot in new_bots:
            get_logger().bot(  # log each newly provisioned bot
                BotEvent.INIT, bot.name, email,
                {"bot_id": bot.id, "module_id": module["id"], "module_scope": module["scope"]},
            )
        if not payload.backend_url and manifest.get("backend_url"):
            module = pg.update_module(module["id"], {"backend_url": manifest["backend_url"]}) or module  # auto-configure backend_url from manifest when not explicitly set
        i18n_data = manifest.get("i18n") or {}  # optional i18n section; keys are language codes
        if i18n_data:
            updated_presets = {**module.get("presets", {}), "i18n": i18n_data}  # snapshot i18n in presets so reset-i18n can replay it
            module = pg.update_module(module["id"], {"presets": updated_presets}) or module
            for lang, translations in i18n_data.items():
                pg.merge_i18n_data(lang, translations)  # deep-merge each language's translations into the DB
    except Exception:
        pass  # manifest probe failure must not roll back the module registration
    return module  # return the final module dict, potentially enriched by manifest fields


@router.post("/modules/{module_id}/reset-i18n", status_code=204)
async def reset_module_i18n(module_id: str, _: str = Depends(admin_dep)):
    """Re-merge the i18n snapshot stored in module.presets.i18n back into the translations table (admin only)."""
    pg = get_pg()
    module = pg.get_module_by_id(module_id)  # look up the module to access its presets
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")
    i18n = module.get("presets", {}).get("i18n", {})  # extract the snapshotted i18n data from presets
    for lang, data in i18n.items():
        pg.merge_i18n_data(lang, data)  # re-apply each language; admin overrides take precedence
    return Response(status_code=204)  # 204 No Content


@router.put("/modules/{module_id}")
async def update_module(module_id: str, payload: ModuleInput, email: str = Depends(admin_dep)):
    """Update the configuration of an existing module by ID (admin only)."""
    pg = get_pg()
    old = pg.get_module_by_id(module_id)  # read the current state to detect enabled↔disabled transitions
    if old is None:
        raise HTTPException(status_code=404, detail="Module not found")
    module = pg.update_module(module_id, payload.model_dump())  # apply all fields from the payload
    if module is None:
        raise HTTPException(status_code=404, detail="Module not found")  # guard against race condition
    if payload.enabled and not old["enabled"]:
        event = ModuleEvent.ACTIVATE    # module is being re-enabled
    elif not payload.enabled and old["enabled"]:
        event = ModuleEvent.DEACTIVATE  # module is being disabled
    else:
        event = ModuleEvent.UPDATE  # configuration changed without toggling enabled state
    get_logger().module(  # log the outcome event; message auto-generated from event slug
        event, module["scope"], module["name"], email,
        {"module_id": module_id},
    )
    return module  # return the updated module dict


@router.delete("/modules/{module_id}", status_code=204)
async def delete_module(module_id: str, email: str = Depends(admin_dep)):
    """Permanently remove a registered module by ID (admin only)."""
    pg = get_pg()
    mod = pg.get_module_by_id(module_id)  # read before delete to capture name and scope for the log entry
    if not mod or not pg.delete_module(module_id):
        raise HTTPException(status_code=404, detail="Module not found")
    get_logger().module(  # log deletion after the row is gone; name/scope captured above
        ModuleEvent.DELETE, mod["scope"], mod["name"], email,
        {"module_id": module_id},
    )
    return Response(status_code=204)  # 204 No Content


@router.get("/modules/discover")
async def discover_modules(_: str = Depends(admin_dep)):
    """Probe MODULE_REGISTRY_URLS for available modules and report which are already registered."""
    raw = os.getenv("MODULE_REGISTRY_URLS", "").strip()  # comma-separated list of base URLs to probe
    if not raw:
        return []  # no registry URLs configured; nothing to discover
    base_urls = [u.strip().rstrip("/") for u in raw.split(",") if u.strip()]  # normalise each URL
    all_modules = get_pg().get_modules(enabled_only=False)  # need all modules, not just enabled ones
    registered_scopes = {m["scope"] for m in all_modules}  # set for O(1) already-registered checks
    # Keyed by scope to let fetch_one attach id + enabled without a second DB round-trip.
    registered_scopes_full = {m["scope"]: m for m in all_modules}  # dict for id/enabled lookup when scope matches

    async def fetch_one(base_url: str) -> dict | None:
        """Probe a single registry URL and return a DiscoveredModule dict or None on failure."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{base_url}/manifest.json")  # every module exposes its manifest at /manifest.json
                resp.raise_for_status()
                m = resp.json()
            scope = m.get("scope")
            already = bool(scope and scope in registered_scopes)  # True when this scope is already in the modules table
            existing = registered_scopes_full.get(scope) if already else None  # retrieve the existing row for id/enabled
            return DiscoveredModule(
                source_url=base_url,
                name=m.get("name"),
                scope=scope,
                component=m.get("component"),
                route=m.get("route"),
                icon=m.get("icon"),
                roles=m.get("roles"),
                description=m.get("description"),
                remote_url=m.get("remote_url") or m.get("remote_entry") or f"{base_url}/remoteEntry.js",  # multiple fallbacks for legacy manifests
                already_registered=already,
                module_id=existing["id"] if existing else None,
                enabled=existing["enabled"] if existing else None,
            ).model_dump()
        except Exception:
            return None  # probe failed; exclude this URL from the results rather than surface an error

    results = await asyncio.gather(*[fetch_one(u) for u in base_urls])  # fan-out all probes in parallel
    return [r for r in results if r is not None]  # filter out None entries from failed probes
