from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, get_adapter
from app.settings import read_settings
from app.state import set_settings

from app.routes import auth, dashboard, ingestion, settings, setup


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = read_settings()
    set_settings(s)
    if s.setup_complete:
        init_db(s)
        db = get_adapter()
        if not db.get_page("dashboard"):
            db.upsert_page("dashboard", "Hello welcome")
    yield


app = FastAPI(title="spin-core API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(setup.router)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(ingestion.router)
