from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_ch
from app.deps import token_dep, admin_dep
from app.routes.module_logs.schemas import LogPayload
from app.routes.module_logs.utils import _get_scope

router = APIRouter(prefix="/api/module-logs", tags=["module-logs"])


@router.post("/{module_id}", status_code=201)
async def write_module_log(
    module_id: str,
    payload: LogPayload,
    user_email: str = Depends(token_dep),
):
    """Write a structured event log entry for a module to ClickHouse."""
    scope = _get_scope(module_id)
    get_ch().write_module_log(scope, user_email, payload.event_type, payload.details)
    return {"ok": True}


@router.get("/{module_id}/summary")
async def get_module_logs_summary(
    module_id: str,
    _: str = Depends(admin_dep),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    event_type: Optional[str] = Query(default=None),
    limit: int = Query(default=500, le=2000),
    offset: int = Query(default=0, ge=0),
):
    """Return hourly aggregated event summaries for a module log, filtered by time range and event type."""
    scope = _get_scope(module_id)
    return get_ch().query_module_logs_summary(
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
    _: str = Depends(admin_dep),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
):
    """Return paginated raw event log entries for a module, filtered by time range and event type."""
    scope = _get_scope(module_id)
    return get_ch().query_module_logs(
        scope,
        limit=limit,
        offset=offset,
        event_type=event_type,
        from_dt=from_dt,
        to_dt=to_dt,
    )
