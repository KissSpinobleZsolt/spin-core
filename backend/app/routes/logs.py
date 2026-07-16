from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_ch, get_pg
from app.deps import admin_dep

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
async def get_logs(
    _: str = Depends(admin_dep),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None),
    user_email: Optional[str] = Query(default=None),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
):
    """Return paginated HTTP request logs from ClickHouse filtered by time range, event type, and user."""
    return get_ch().query_logs(
        limit=limit,
        offset=offset,
        event_type=event_type,
        user_email=user_email,
        from_dt=from_dt,
        to_dt=to_dt,
    )


@router.post("/purge")
async def purge_expired_logs(_: str = Depends(admin_dep)):
    """Trigger an OPTIMIZE on all ClickHouse log tables to evict expired TTL rows."""
    scopes = [m["scope"] for m in get_pg().get_modules()]
    return get_ch().optimize_tables(scopes)


@router.get("/summary")
async def get_logs_summary(
    _: str = Depends(admin_dep),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    event_type: Optional[str] = Query(default=None),
    path: Optional[str] = Query(default=None),
    limit: int = Query(default=500, le=2000),
    offset: int = Query(default=0, ge=0),
):
    """Return hourly aggregated HTTP log summaries filtered by time range, event type, and path."""
    return get_ch().query_app_logs_mv(
        from_dt=from_dt,
        to_dt=to_dt,
        event_type=event_type,
        path=path,
        limit=limit,
        offset=offset,
    )
