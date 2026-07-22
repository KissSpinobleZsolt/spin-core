from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_ch
from app.deps import admin_dep

router = APIRouter(prefix="/api/logs", tags=["logs"])  # mounts all log-viewer endpoints under /api/logs


@router.get("")
async def get_logs(
    _: str = Depends(admin_dep),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None),
    owner: Optional[str] = Query(default=None),
    level: Optional[str] = Query(default=None),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
):
    """Return paginated API request logs from ClickHouse filtered by time range, event type, owner, and level."""
    return get_ch().query_api_logs(  # delegate filtering and pagination to the ClickHouse adapter
        limit=limit,
        offset=offset,
        event_type=event_type,
        owner=owner,
        level=level,
        from_dt=from_dt,
        to_dt=to_dt,
    )


@router.get("/user")
async def get_user_logs(
    _: str = Depends(admin_dep),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None),
    owner: Optional[str] = Query(default=None),
    level: Optional[str] = Query(default=None),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
):
    """Return paginated user lifecycle logs from ClickHouse filtered by level."""
    return get_ch().query_user_logs(  # delegate to the ClickHouse adapter for user_logs table
        limit=limit,
        offset=offset,
        event_type=event_type,
        owner=owner,
        level=level,
        from_dt=from_dt,
        to_dt=to_dt,
    )


@router.post("/purge")
async def purge_expired_logs(_: str = Depends(admin_dep)):
    """Trigger an OPTIMIZE on all ClickHouse log tables to evict expired TTL rows."""
    return get_ch().optimize_tables()  # runs OPTIMIZE TABLE FINAL on each of the 5 base log tables


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
    """Return hourly aggregated API log summaries filtered by time range, event type, and path."""
    return get_ch().query_api_logs_summary(  # delegate to the ClickHouse adapter GROUP BY query
        from_dt=from_dt,
        to_dt=to_dt,
        event_type=event_type,
        path=path,
        limit=limit,
        offset=offset,
    )
