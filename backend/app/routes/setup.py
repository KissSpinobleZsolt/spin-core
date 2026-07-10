from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import hash_password
from app.database import init_db
from app.settings import AppSettings, ModuleConfig, ThemeConfig, new_module_id, write_settings
from app.state import get_settings, set_settings

router = APIRouter(prefix="/api/setup", tags=["setup"])


class TestConnectionPayload(BaseModel):
    db_type: Literal["postgres", "mongodb", "clickhouse"]
    db_url: str


class ModuleInput(BaseModel):
    name: str
    remote_url: str
    scope: str
    component: str
    route: str
    icon: str = "🧩"
    enabled: bool = True
    roles: list[str] = ["user", "admin"]


class SetupPayload(BaseModel):
    db_type: Literal["postgres", "mongodb", "clickhouse"]
    db_url: str
    admin_name: str
    admin_email: str
    admin_password: str
    default_theme: Literal["dark", "light"] = "dark"
    modules: list[ModuleInput] = []


def _make_adapter(db_type: str, db_url: str):
    if db_type == "postgres":
        from app.db.postgres import PostgresAdapter
        return PostgresAdapter(db_url)
    elif db_type == "mongodb":
        from app.db.mongo import MongoAdapter
        return MongoAdapter(db_url)
    else:
        from app.db.clickhouse import ClickHouseAdapter
        return ClickHouseAdapter(db_url)


@router.get("/status")
async def setup_status():
    return {"setup_complete": get_settings().setup_complete}


@router.post("/test-connection")
async def test_connection(payload: TestConnectionPayload):
    try:
        _make_adapter(payload.db_type, payload.db_url).test_connection()
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


@router.post("/complete", status_code=201)
async def complete_setup(payload: SetupPayload):
    if get_settings().setup_complete:
        raise HTTPException(status_code=409, detail="Setup already completed")

    try:
        adapter = _make_adapter(payload.db_type, payload.db_url)
        adapter.test_connection()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot connect to database: {exc}")

    adapter.create_user(
        email=payload.admin_email,
        name=payload.admin_name,
        hashed_password=hash_password(payload.admin_password),
        roles=["user", "admin"],
        default_theme=payload.default_theme,
    )
    adapter.upsert_page("dashboard", "Hello welcome")

    modules = [ModuleConfig(id=new_module_id(), **m.model_dump()) for m in payload.modules]
    new_settings = AppSettings(
        setup_complete=True,
        db_type=payload.db_type,
        db_url=payload.db_url,
        theme=ThemeConfig(default_theme=payload.default_theme),
        modules=modules,
    )
    write_settings(new_settings)
    set_settings(new_settings)
    init_db(new_settings)
    return {"status": "ok"}
