import asyncio
import os
import sys
import time
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, get_pg, get_ch
from app.events import LogLevel, BotEvent, ComponentEvent, ModuleEvent, PageEvent, UserEvent, lifecycle_message
from app.model_tracker import run_sequential_trackers
from app.seed_loader import load_seed
from app.settings import SETTINGS_PATH, AppSettings, ThemeConfig, read_settings, read_legacy_modules, write_settings
from app.state import get_settings, set_settings

from app.routes import auth, dashboard, settings, logs, module_data, module_logs, bot_logs, i18n as i18n_router, health, chat, model_status, bots, plugin_proxy, pages, notifications, ui_components
from app.routes.model_status.utils import _required_models


def _build_module_dict(m: dict) -> dict:
    return {
        "id": m.get("id"),
        "name": m.get("name", ""),
        "description": m.get("description", ""),
        "remote_url": m.get("remote_url", ""),
        "scope": m.get("scope", ""),
        "component": m.get("component", "./App"),
        "route": m.get("route", ""),
        "icon": m.get("icon", "🧩"),
        "enabled": m.get("enabled", True),
        "roles": m.get("roles", ["user", "admin"]),
        "presets": m.get("presets", {"i18n": {}, "layout": {}, "settings": {}}),
        "backend_url": m.get("backend_url"),
    }


_PURGE_INTERVAL_SECONDS = 24 * 60 * 60  # 24 hours
_MODULE_HEALTH_INTERVAL_SECONDS = 30

# Scopes disabled automatically by the health checker (not by an admin),
# so they can be re-enabled automatically when the container comes back.
_auto_disabled_scopes: set[str] = set()


async def _module_health_checker() -> None:
    # Wait one interval before the first check — modules may still be starting when the backend boots.
    await asyncio.sleep(_MODULE_HEALTH_INTERVAL_SECONDS)
    while True:
        try:
            modules = get_pg().get_modules(enabled_only=False)
            async with httpx.AsyncClient(timeout=5.0) as client:
                for m in modules:
                    remote_url = m.get("remote_url", "")
                    if not remote_url:
                        continue
                    scope = m["scope"]
                    enabled = m.get("enabled", False)
                    parsed = urlparse(remote_url)
                    # remote_url points to remoteEntry.js; probe /manifest.json instead —
                    # it's a lightweight JSON canary that every module dev server exposes.
                    manifest_url = f"{parsed.scheme}://{parsed.netloc}/manifest.json"
                    try:
                        resp = await client.get(manifest_url)
                        resp.raise_for_status()
                        # Only re-enable if the checker itself disabled it; admin-disabled modules stay off.
                        if not enabled and scope in _auto_disabled_scopes:
                            get_pg().update_module(m["id"], {"enabled": True})
                            _auto_disabled_scopes.discard(scope)
                            print(f"[spin-core] Module back online, re-enabled: {scope}", file=sys.stderr)
                            get_ch().write_module_log(
                                scope, "system", ModuleEvent.ACTIVATE, {"source": "health-checker"},
                                level=LogLevel.INFO, name=m.get("name", scope),
                                message=lifecycle_message(ModuleEvent.ACTIVATE, m.get("name", scope)),
                            )
                    except Exception:
                        if enabled:
                            get_pg().update_module(m["id"], {"enabled": False})
                            _auto_disabled_scopes.add(scope)
                            print(f"[spin-core] Module offline, auto-disabled: {scope}", file=sys.stderr)
                            get_ch().write_module_log(
                                scope, "system", ModuleEvent.DEACTIVATE, {"source": "health-checker"},
                                level=LogLevel.WARN, name=m.get("name", scope),
                                message=lifecycle_message(ModuleEvent.DEACTIVATE, m.get("name", scope)),
                            )
        except Exception as exc:
            print(f"[spin-core] Module health check error: {exc}", file=sys.stderr)
        await asyncio.sleep(_MODULE_HEALTH_INTERVAL_SECONDS)


async def _daily_log_purge() -> None:
    await asyncio.sleep(_PURGE_INTERVAL_SECONDS)
    while True:
        try:
            scopes = [m["scope"] for m in get_pg().get_modules()]
            result = get_ch().optimize_tables(scopes)
            print(f"[spin-core] Daily log purge: {len(result['purged'])} table(s) optimized", file=sys.stderr)
        except Exception as exc:
            print(f"[spin-core] Daily log purge failed: {exc}", file=sys.stderr)
        await asyncio.sleep(_PURGE_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    set_settings(read_settings())
    init_db()

    pg = get_pg()
    seed = load_seed()

    # Seed admin from env vars on first run
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    # CH is not initialized yet at this point; user.init log is written after ch = get_ch() below
    admin_created = False
    if admin_email and admin_password:
        if not pg.get_user_by_email(admin_email):
            from app.auth import hash_password
            admin_name = os.getenv("ADMIN_NAME", "Admin")
            pg.create_user(
                email=admin_email,
                name=admin_name,
                hashed_password=hash_password(admin_password),
                roles=["user", "admin"],
                default_theme=seed.default_theme,
            )
            admin_created = True
            print(f"[spin-core] Admin user created: {admin_email}", file=sys.stderr)
    else:
        print("[spin-core] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed", file=sys.stderr)

    if not pg.get_page("dashboard"):
        pg.upsert_page("dashboard", seed.dashboard_content)

    for bt in seed.bot_types:
        pg.upsert_bot_type(bt)

    for uc in seed.ui_components:
        pg.upsert_ui_component(uc)

    # Seed default bots on first run
    if not pg.get_bots(admin=True):
        import dataclasses
        for bot_data in seed.bots:
            pg.create_bot(**dataclasses.asdict(bot_data))
            print(f"[spin-core] Seeded bot: {bot_data.name}", file=sys.stderr)

    # Migrate legacy modules from settings.json into DB (one-time)
    legacy_modules = read_legacy_modules()
    if legacy_modules:
        for m_data in legacy_modules:
            scope = m_data.get("scope")
            if not scope or scope == "chatbot":
                continue
            try:
                pg.upsert_module({**_build_module_dict(m_data), "id": m_data.get("id")})
                print(f"[spin-core] Migrated module to DB: {scope}", file=sys.stderr)
            except Exception as exc:
                print(f"[spin-core] Module migration failed for {scope}: {exc}", file=sys.stderr)
        # Rewrite settings.json without modules so migration is skipped on next startup
        write_settings(get_settings())

    # Seed default modules if DB is empty
    if not pg.get_modules():
        for m_data in seed.modules:
            scope = m_data.get("scope")
            if not scope or scope == "chatbot":
                continue
            try:
                pg.upsert_module(_build_module_dict(m_data))
                print(f"[spin-core] Seeded module: {scope}", file=sys.stderr)
            except Exception as exc:
                print(f"[spin-core] Module seed failed for {scope}: {exc}", file=sys.stderr)

    # Initialise ClickHouse: migrate legacy tables/columns, then provision the 5 base tables
    ch = get_ch()
    ch.run_migrations()
    ch.ensure_api_logs()
    ch.ensure_app_logs()
    ch.ensure_user_logs()
    ch.ensure_module_logs_table()
    ch.ensure_bot_logs_table()
    ch.ensure_notifications_table()
    ch.write_app_log("INFO", "app.start", "system", "spin-core backend started", name="spin-core")

    # Runs every startup — catches bots that exist in PG but lost CH history after a wipe
    # Write bot.init for any bot that has no CH history yet (covers first-run and CH wipes)
    try:
        bots_with_logs = ch.get_bot_names_with_logs()
        for bot in pg.get_bots(admin=True):
            if bot.name not in bots_with_logs:
                ch.write_bot_log(
                    bot.name, "system", BotEvent.INIT,
                    {"bot_id": str(bot.id), "source": "startup"},
                    level=LogLevel.INFO, name=bot.name,
                    message=lifecycle_message(BotEvent.INIT, bot.name),
                )
    except Exception as exc:
        print(f"[spin-core] Failed to write startup bot.init logs: {exc}", file=sys.stderr)

    # Write component.init for any UI component that has no CH history yet
    try:
        components_with_logs = ch.get_component_names_with_logs()
        for comp in pg.get_ui_components():
            if comp["name"] not in components_with_logs:
                ch.write_module_log(
                    "system", "system", ComponentEvent.INIT,
                    {"component": comp["name"], "file": comp["file"], "source": "startup"},
                    level=LogLevel.INFO, name=comp["name"],
                    message=lifecycle_message(ComponentEvent.INIT, comp["name"]),
                )
    except Exception as exc:
        print(f"[spin-core] Failed to write startup component.init logs: {exc}", file=sys.stderr)

    # Write user.init for the admin if it was just seeded this startup
    if admin_created and admin_email:
        try:
            ch.write_user_log(
                LogLevel.INFO, UserEvent.INIT, admin_email,
                lifecycle_message(UserEvent.INIT, admin_name),
                name=admin_name,
                details={"source": "seed"},
            )
        except Exception as exc:
            print(f"[spin-core] Failed to write admin user.init log: {exc}", file=sys.stderr)

    # Auto-discover from MODULE_REGISTRY_URLS (inserts only new scopes, never overwrites)
    registry_urls_env = os.getenv("MODULE_REGISTRY_URLS", "").strip()
    if registry_urls_env:
        base_urls = [u.strip().rstrip("/") for u in registry_urls_env.split(",") if u.strip()]
        registered_scopes = {m["scope"] for m in pg.get_modules()}
        async with httpx.AsyncClient(timeout=5.0) as client:
            for base_url in base_urls:
                try:
                    resp = await client.get(f"{base_url}/manifest.json")
                    resp.raise_for_status()
                    m = resp.json()
                    scope = m.get("scope")
                    if scope and scope != "chatbot" and scope not in registered_scopes:
                        pg.upsert_module({
                            **_build_module_dict(m),
                            "name": m.get("name", scope),
                            "remote_url": m.get("remote_url") or m.get("remote_entry") or f"{base_url}/remoteEntry.js",
                            "scope": scope,
                            "route": m.get("route", scope.lower()),
                            "enabled": False,  # admin must enable explicitly — auto-discovery never activates on its own
                            "presets": {"i18n": {}, "layout": {}, "settings": {}},
                        })
                        registered_scopes.add(scope)
                        print(f"[spin-core] Auto-discovered module (inactive): {scope}", file=sys.stderr)
                        ch.write_module_log(
                            scope, "system", ModuleEvent.INIT,
                            {"scope": scope, "source": "auto-discovery"},
                            level=LogLevel.INFO, name=m.get("name", scope),
                            message=lifecycle_message(ModuleEvent.INIT, m.get("name", scope)),
                        )
                        mod = pg.get_module_by_scope(scope)
                        if mod:
                            i18n_data = m.get("i18n") or {}
                            if i18n_data:
                                pg.update_module(mod["id"], {"presets": {**mod.get("presets", {}), "i18n": i18n_data}})
                                for lang, translations in i18n_data.items():
                                    pg.merge_i18n_data(lang, translations)
                        bots_from_manifest = m.get("bots") or []
                        if bots_from_manifest:
                            if not mod:
                                # Re-fetch only when the i18n block above didn't load it
                                mod = pg.get_module_by_scope(scope)
                            if mod:
                                new_bots = pg.seed_bots_for_module(mod["id"], bots_from_manifest, created_by=admin_email or "")
                                for bot in new_bots:
                                    ch.write_bot_log(
                                        bot.name, "system", BotEvent.INIT,
                                        {"bot_id": bot.id, "module_scope": scope, "source": "auto-discovery"},
                                        level=LogLevel.INFO, name=bot.name,
                                        message=lifecycle_message(BotEvent.INIT, bot.name),
                                    )
                except Exception as exc:
                    print(f"[spin-core] Discovery failed for {base_url}: {exc}", file=sys.stderr)

    # Write initial settings.json on very first run (theme only)
    if not SETTINGS_PATH.exists():
        write_settings(AppSettings(theme=ThemeConfig(default_theme=seed.default_theme)))

    # Seed / merge default translations into PostgreSQL on every startup
    from app.i18n_defaults import DEFAULT_TRANSLATIONS
    for lang, data in DEFAULT_TRANSLATIONS.items():
        pg.merge_i18n_data(lang, data)

    # Ensure the "system" virtual module exists — represents the native platform
    pg.upsert_module({
        "name": "System",
        "description": "Native platform pages and built-in components.",
        "remote_url": "",
        "scope": "system",
        "component": "",
        "route": "",
        "icon": "🖥️",
        "enabled": True,
        "roles": ["user", "admin"],
        "presets": {},
        "subscription": "system",
    })

    _PAGE_REGISTRY_SEED = [
        ("", {"title": "Dashboard", "component_key": "Dashboard", "roles": ["user", "admin"], "skeleton": {"type": "cards", "columns": 3, "rows": 2}}),
        ("logs", {"title": "Logs", "component_key": "Logs", "roles": ["admin"], "skeleton": {"type": "table", "columns": 5, "rows": 8}}),
        ("translations", {"title": "Translations", "component_key": "Translations", "roles": ["admin"], "skeleton": {"type": "table", "columns": 3, "rows": 6}}),
        ("bots", {"title": "Bots", "component_key": "Bots", "roles": ["user", "admin"], "skeleton": {"type": "cards", "columns": 3, "rows": 2}}),
        ("bots-admin", {"title": "Bots Admin", "component_key": "BotsAdmin", "roles": ["admin"], "skeleton": {"type": "table", "columns": 7, "rows": 5}}),
        ("admin/llms", {"title": "LLMs", "component_key": "LLMs", "roles": ["admin"], "skeleton": {"type": "table", "columns": 4, "rows": 4}}),
        ("admin/users", {"title": "Users", "component_key": "Users", "roles": ["admin"], "skeleton": {"type": "table", "columns": 5, "rows": 5}}),
        ("admin/modules", {"title": "Modules", "component_key": "Modules", "roles": ["admin"], "skeleton": {"type": "table", "columns": 4, "rows": 4}}),
        ("admin/status", {"title": "Status", "component_key": "Status", "roles": ["admin"], "skeleton": {"type": "cards", "columns": 3, "rows": 1}}),
        ("admin/components", {"title": "Components", "component_key": "Components", "roles": ["admin"], "skeleton": {"type": "doc", "rows": 8}}),
        ("admin/layouts", {"title": "Layouts", "component_key": "Layouts", "roles": ["admin"], "skeleton": {"type": "doc", "rows": 6}}),
        ("admin/docs/ui", {"title": "UI Docs", "component_key": "DocsUI", "roles": ["admin"], "skeleton": {"type": "doc", "rows": 10}}),
        ("admin/docs/api", {"title": "API Docs", "component_key": "DocsApi", "roles": ["admin"], "skeleton": {"type": "doc", "rows": 10}}),
        ("admin/docs/deployment", {"title": "Deployment Docs", "component_key": "DocsDeployment", "roles": ["admin"], "skeleton": {"type": "doc", "rows": 10}}),
    ]
    try:
        pages_with_logs = ch.get_page_routes_with_logs()
    except Exception:
        # ClickHouse unavailable at startup — fall back to empty so all pages get an init log
        # written once CH recovers; this may produce a duplicate log on the next clean restart
        pages_with_logs = set()
    for route, data in _PAGE_REGISTRY_SEED:
        pg.seed_page_registry(route, {**data, "type": "native", "enabled": True})
        page_key = route or "/"
        if page_key not in pages_with_logs:
            try:
                ch.write_module_log(
                    "system", "system", PageEvent.INIT,
                    {"route": route or "/", "title": data["title"], "source": "seed"},
                    level=LogLevel.INFO, name=page_key,
                    message=lifecycle_message(PageEvent.INIT, data["title"]),
                )
            except Exception as exc:
                print(f"[spin-core] Failed to write page.init log for {page_key}: {exc}", file=sys.stderr)

    tracker_task = asyncio.create_task(run_sequential_trackers(_required_models()))
    purge_task = asyncio.create_task(_daily_log_purge())
    health_task = asyncio.create_task(_module_health_checker())

    yield

    tracker_task.cancel()
    purge_task.cancel()
    health_task.cancel()
    for task in (tracker_task, purge_task, health_task):
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="spin-core API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    try:
        auth_header = request.headers.get("authorization", "")
        user_email = ""
        if auth_header.startswith("Bearer "):
            from app.auth import decode_token
            try:
                user_email = decode_token(auth_header.removeprefix("Bearer "))
            except Exception:
                pass
        get_ch().write_api_log(
            level="INFO",
            event_type="http.request",
            owner=user_email,
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
    except Exception:
        pass
    return response


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(logs.router)
app.include_router(module_data.router)
app.include_router(module_logs.router)
app.include_router(bot_logs.router)
app.include_router(i18n_router.router)
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(model_status.router)
app.include_router(bots.router)
app.include_router(plugin_proxy.router)
app.include_router(pages.router)
app.include_router(notifications.router)
app.include_router(ui_components.router)
