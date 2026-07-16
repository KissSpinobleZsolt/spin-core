from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_ch, get_pg
from app.deps import admin_dep

router = APIRouter(prefix="/api/bot-logs", tags=["bot-logs"])


def _get_bot_name(bot_id: str) -> str:
    """Resolve the bot name (used as ClickHouse table key) from a bot ID, raising 404 if missing."""
    # ClickHouse tables are named bot_<safe_name>_logs, not bot_<uuid>_logs — name is the key.
    bot = get_pg().get_bot_by_id(bot_id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot.name


@router.get("/{bot_id}/summary")
async def get_bot_logs_summary(
    bot_id: str,
    _: str = Depends(admin_dep),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
    event_type: Optional[str] = Query(default=None),
    limit: int = Query(default=500, le=2000),
    offset: int = Query(default=0, ge=0),
):
    """Return hourly aggregated event summaries for a bot log, filtered by time range and event type."""
    bot_name = _get_bot_name(bot_id)
    return get_ch().query_bot_logs_mv(
        bot_name,
        from_dt=from_dt,
        to_dt=to_dt,
        event_type=event_type,
        limit=limit,
        offset=offset,
    )


@router.get("/{bot_id}")
async def read_bot_logs(
    bot_id: str,
    _: str = Depends(admin_dep),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
):
    """Return paginated raw event log entries for a bot, filtered by time range and event type."""
    bot_name = _get_bot_name(bot_id)
    return get_ch().query_bot_logs(
        bot_name,
        limit=limit,
        offset=offset,
        event_type=event_type,
        from_dt=from_dt,
        to_dt=to_dt,
    )
