import asyncio
import os
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, get_pg, get_ch, get_mongo
from app.model_tracker import run_sequential_trackers
from app.settings import read_settings
from app.state import set_settings

from app.routes import auth, dashboard, ingestion, settings, logs, module_data, i18n as i18n_router, health, chat, model_status
from app.routes.model_status import _required_models
from app.settings import ModuleConfig, new_module_id, write_settings
from app.state import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    set_settings(read_settings())
    init_db()

    pg = get_pg()

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
                default_theme="dark",
            )
            print(f"[spin-core] Admin user created: {admin_email}", file=sys.stderr)
    else:
        print("[spin-core] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed", file=sys.stderr)

    if not pg.get_page("dashboard"):
        pg.upsert_page("dashboard", "Hello welcome")

    # Seed default translations into MongoDB on first run
    from app.i18n_defaults import DEFAULT_TRANSLATIONS
    mongo = get_mongo()
    for lang, data in DEFAULT_TRANSLATIONS.items():
        if mongo.get_i18n_data(lang) is None:
            mongo.set_i18n_data(lang, data)

    # Seed built-in chatbot module on first run
    s = get_settings()
    if not any(m.scope == "chatbot" for m in s.modules):
        chatbot_url = os.getenv("CHATBOT_REMOTE_URL", "http://localhost:3002/remoteEntry.js")
        s.modules.append(ModuleConfig(
            id=new_module_id(),
            name="Chatbot",
            remote_url=chatbot_url,
            scope="chatbot",
            component="./ChatPage",
            route="chatbot",
            icon="💬",
            enabled=True,
            roles=["user", "admin"],
        ))
        write_settings(s)
        print("[spin-core] Chatbot module seeded", file=sys.stderr)

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
app.include_router(i18n_router.router)
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(model_status.router)
