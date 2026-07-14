from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.database import get_ch
from app.deps import require_admin, require_token
from app.state import get_settings

router = APIRouter(prefix="/api/module-logs", tags=["module-logs"])


def _get_scope(module_id: str) -> str:
    for m in get_settings().modules:
        if m.id == module_id:
            return m.scope
    raise HTTPException(status_code=404, detail="Module not found")


class LogPayload(BaseModel):
    event_type: str
    details: dict = {}


@router.post("/{module_id}", status_code=201)
async def write_module_log(
    module_id: str,
    payload: LogPayload,
    authorization: str = Header(default=""),
):
    user_email = require_token(authorization)
    scope = _get_scope(module_id)
    get_ch().write_module_log(scope, user_email, payload.event_type, payload.details)
    return {"ok": True}


@router.get("/{module_id}/summary")
async def get_module_logs_summary(
    module_id: str,
    authorization: str = Header(default=""),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    event_type: Optional[str] = Query(default=None),
    limit: int = Query(default=500, le=2000),
    offset: int = Query(default=0, ge=0),
):
    require_admin(authorization)
    scope = _get_scope(module_id)
    return get_ch().query_module_logs_mv(
        scope,
        from_dt=from_dt,
        to_dt=to_dt,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )


@router.get("/{module_id}")
async def read_module_logs(
    module_id: str,
    authorization: str = Header(default=""),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
):
    require_admin(authorization)
    scope = _get_scope(module_id)
    return get_ch().query_module_logs(
        scope,
        limit=limit,
        offset=offset,
        event_type=event_type,
        from_dt=from_dt,
        to_dt=to_dt,
    )
