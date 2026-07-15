import asyncio
import os
import sys
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, get_pg, get_ch
from app.model_tracker import run_sequential_trackers
from app.seed_loader import load_seed
from app.settings import SETTINGS_PATH, AppSettings, ThemeConfig, read_settings, read_legacy_modules, write_settings
from app.state import get_settings, set_settings

from app.routes import auth, dashboard, ingestion, settings, logs, module_data, module_logs, i18n as i18n_router, health, chat, model_status, bots
from app.routes.model_status import _required_models


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
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    set_settings(read_settings())
    init_db()

    pg = get_pg()
    seed = load_seed()

    # Seed admin from env vars on first run
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if admin_email and admin_password:
        if not pg.get_user_by_email(admin_email):
            from app.auth import hash_password
            pg.create_user(
                email=admin_email,
                name=os.getenv("ADMIN_NAME", "Admin"),
                hashed_password=hash_password(admin_password),
                roles=["user", "admin"],
                default_theme=seed.default_theme,
            )
            print(f"[spin-core] Admin user created: {admin_email}", file=sys.stderr)
    else:
        print("[spin-core] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed", file=sys.stderr)

    if not pg.get_page("dashboard"):
        pg.upsert_page("dashboard", seed.dashboard_content)

    for bt in seed.bot_types:
        pg.upsert_bot_type(bt)

    # Seed default bots on first run
    if not pg.get_bots(admin=True):
        import dataclasses
        for bot in seed.bots:
            pg.create_bot(**dataclasses.asdict(bot))
            print(f"[spin-core] Seeded bot: {bot.name}", file=sys.stderr)

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
                            "enabled": True,
                            "presets": {"i18n": {}, "layout": {}, "settings": {}},
                        })
                        registered_scopes.add(scope)
                        print(f"[spin-core] Auto-discovered module: {scope}", file=sys.stderr)
                        bots_from_manifest = m.get("bots") or []
                        if bots_from_manifest:
                            mod = pg.get_module_by_scope(scope)
                            if mod:
                                pg.seed_bots_for_module(mod["id"], bots_from_manifest, created_by=admin_email or "")
                except Exception as exc:
                    print(f"[spin-core] Discovery failed for {base_url}: {exc}", file=sys.stderr)

    # Write initial settings.json on very first run (theme only)
    if not SETTINGS_PATH.exists():
        write_settings(AppSettings(theme=ThemeConfig(default_theme=seed.default_theme)))

    # Seed / merge default translations into PostgreSQL on every startup
    from app.i18n_defaults import DEFAULT_TRANSLATIONS
    for lang, data in DEFAULT_TRANSLATIONS.items():
        pg.merge_i18n_data(lang, data)

    # Ensure ClickHouse tables + materialized views for app_logs, chatbot, and all registered modules
    ch = get_ch()
    ch.ensure_app_logs_mv()
    for m in pg.get_modules():
        ch.ensure_module_table(m["scope"])
        ch.ensure_module_mv(m["scope"])

    tracker_task = asyncio.create_task(run_sequential_trackers(_required_models()))

    yield

    tracker_task.cancel()
    try:
        await tracker_task
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
        get_ch().write_log(
            level="INFO",
            event_type="http.request",
            user_email=user_email,
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
            details={},
        )
    except Exception:
        pass
    return response


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(ingestion.router)
app.include_router(logs.router)
app.include_router(module_data.router)
app.include_router(module_logs.router)
app.include_router(i18n_router.router)
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(model_status.router)
app.include_router(bots.router)
