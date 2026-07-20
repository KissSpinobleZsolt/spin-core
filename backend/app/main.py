import asyncio
import os
import sys
import time
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, get_pg, get_ch, init_logger, get_logger
from app.events import LogLevel, BotEvent, ModuleEvent, PageEvent, UserEvent
from app.model_tracker import run_sequential_trackers
from app.seed_loader import load_seed
from app.settings import SETTINGS_PATH, AppSettings, ThemeConfig, read_settings, read_legacy_modules, write_settings
from app.state import get_settings, set_settings

from app.routes import auth, dashboard, settings, logs, module_data, module_logs, bot_logs, i18n as i18n_router, health, chat, model_status, bots, plugin_proxy, pages, notifications
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
# Scopes that have responded successfully at least once since startup.
# The health checker only auto-disables a module that was previously healthy,
# so a module enabled by an admin but not yet deployed is never touched.
_ever_healthy_scopes: set[str] = set()


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
                        _ever_healthy_scopes.add(scope)  # record first confirmed reachability
                        # Only re-enable if the checker itself disabled it; admin-disabled modules stay off.
                        if not enabled and scope in _auto_disabled_scopes:
                            get_pg().update_module(m["id"], {"enabled": True})  # re-enable the module row in Postgres
                            _auto_disabled_scopes.discard(scope)  # remove from the auto-disabled set so it won't be double-logged
                            print(f"[spin-core] Module back online, re-enabled: {scope}", file=sys.stderr)
                            get_logger().module(  # record the recovery event via the centralised logger
                                ModuleEvent.ACTIVATE, scope, m.get("name", scope), "system",
                                details={"source": "health-checker"},
                            )
                    except Exception:
                        # Only auto-disable a module that was previously healthy — this prevents the
                        # checker from reverting an admin toggle on a module that isn't deployed yet.
                        if enabled and scope in _ever_healthy_scopes:
                            get_pg().update_module(m["id"], {"enabled": False})  # mark the module offline in Postgres
                            _auto_disabled_scopes.add(scope)  # track so the checker can re-enable it automatically
                            print(f"[spin-core] Module offline, auto-disabled: {scope}", file=sys.stderr)
                            get_logger().module(  # record the outage event at WARN level
                                ModuleEvent.DEACTIVATE, scope, m.get("name", scope), "system",
                                details={"source": "health-checker"},
                                level=LogLevel.WARN,
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
    set_settings(read_settings())  # load settings.json into the in-process singleton before anything else touches it
    init_db()  # connect to PostgreSQL and ClickHouse and store their adapter singletons
    init_logger()  # wrap the CH adapter in AppLogger; must come after init_db() so get_ch() is ready

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
                roles=["user", "admin", "system"],  # system grants access to spin-docs and developer tooling
                default_theme=seed.default_theme,
            )
            admin_created = True
            print(f"[spin-core] Admin user created: {admin_email}", file=sys.stderr)
        else:
            # Idempotent migration: ensure the admin always carries the system role,
            # even if the user row was created before the system role was introduced.
            if pg.ensure_user_has_role(admin_email, "system"):
                print(f"[spin-core] Granted 'system' role to existing admin: {admin_email}", file=sys.stderr)
    else:
        print("[spin-core] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed", file=sys.stderr)

    if not pg.get_page("dashboard"):
        pg.upsert_page("dashboard", seed.dashboard_content)

    for bt in seed.bot_types:
        pg.upsert_bot_type(bt)

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

    # Initialise ClickHouse: migrate legacy tables/columns, then provision all base tables
    ch = get_ch()  # raw adapter needed for DDL operations (migrations, ensure_* calls)
    ch.run_migrations()  # rename legacy tables/columns before DDL provisioning
    ch.ensure_api_logs()  # CREATE TABLE IF NOT EXISTS api_logs
    ch.ensure_app_logs()  # CREATE TABLE IF NOT EXISTS app_logs
    ch.ensure_user_logs()  # CREATE TABLE IF NOT EXISTS user_logs
    ch.ensure_module_logs_table()  # CREATE TABLE IF NOT EXISTS module_logs
    ch.ensure_bot_logs_table()  # CREATE TABLE IF NOT EXISTS bot_logs
    ch.ensure_notifications_table()  # CREATE TABLE IF NOT EXISTS notifications
    get_logger().app("app.start", "spin-core", message="spin-core backend started")  # first lifecycle event; signals successful startup

    # Backfill bot.init for any bot that exists in Postgres but has no CH history (first-run or CH wipe)
    try:
        bots_with_logs = ch.get_bot_names_with_logs()  # set of bot names that already have at least one CH entry
        for bot in pg.get_bots(admin=True):
            if bot.name not in bots_with_logs:  # missing CH history — write the init event now
                get_logger().bot(
                    BotEvent.INIT, bot.name, "system",
                    {"bot_id": str(bot.id), "source": "startup"},
                )
    except Exception as exc:
        print(f"[spin-core] Failed to write startup bot.init logs: {exc}", file=sys.stderr)

    # Write user.init for the admin only if the account was seeded during this startup
    if admin_created and admin_email:
        try:
            get_logger().user(  # records who the admin is and that the account was auto-seeded
                UserEvent.INIT, admin_email,
                details={"source": "seed"},
                name=admin_name,
            )
        except Exception as exc:
            print(f"[spin-core] Failed to write admin user.init log: {exc}", file=sys.stderr)

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

    _STALE_PAGE_ROUTES = [  # routes that existed in older seeds but have no FE router entry
        "admin/components",
        "admin/layouts",
        "admin/docs/ui",
        "admin/docs/api",
        "admin/docs/deployment",
    ]
    for stale_route in _STALE_PAGE_ROUTES:
        pg.delete_page_registry(stale_route)  # safe no-op if already gone

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
    ]
    try:
        pages_with_logs = ch.get_page_routes_with_logs()  # set of routes that already have a page.init log
    except Exception:
        # ClickHouse unavailable at startup — fall back to empty so all pages receive an init log;
        # this may produce a duplicate on the next clean restart but is preferable to missing history.
        pages_with_logs = set()
    for route, data in _PAGE_REGISTRY_SEED:
        pg.seed_page_registry(route, {**data, "type": "native", "enabled": True})  # idempotent upsert
        page_key = route or "/"  # use "/" as the key for the root dashboard route
        if page_key not in pages_with_logs:  # only write the init log once per route
            get_logger().module(  # page events go to module_logs under the "system" scope
                PageEvent.INIT, "system", data["title"], "system",
                {"route": route or "/", "title": data["title"], "source": "seed"},
            )

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
    auth_header = request.headers.get("authorization", "")  # extract the auth header to identify the caller
    user_email = ""
    if auth_header.startswith("Bearer "):  # only decode when the header has the expected scheme
        from app.auth import decode_token
        try:
            user_email = decode_token(auth_header.removeprefix("Bearer "))  # JWT decode; silently ignore invalid tokens
        except Exception:
            pass
    get_logger().request(  # AppLogger.request() swallows all exceptions internally
        owner=user_email,
        path=request.url.path,
        method=request.method,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
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
