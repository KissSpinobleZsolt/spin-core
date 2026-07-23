from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.database import get_ch
from app.deps import admin_dep, token_dep
from app.routes.bot_logs.utils import _get_bot_name


class CustomLogBody(BaseModel):
    event_type: str                      # caller-defined event label, e.g. "user.action"
    message: str = ""                    # human-readable description of the event
    name: str = ""                       # optional short identifier for the event source
    level: str = "INFO"                  # severity level: INFO | WARN | ERROR
    details: dict = {}                   # arbitrary JSON payload for structured data

router = APIRouter(prefix="/api/bot-logs", tags=["bot-logs"])  # mounts all bot-log endpoints under /api/bot-logs


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
    bot_name = _get_bot_name(bot_id)  # resolve bot_id to bot_name; raises 404 if not found
    return get_ch().query_bot_logs_summary(
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
    bot_name = _get_bot_name(bot_id)  # resolve bot_id to bot_name; raises 404 if not found
    return get_ch().query_bot_logs(
        bot_name,
        limit=limit,
        offset=offset,
        event_type=event_type,
        from_dt=from_dt,
        to_dt=to_dt,
    )


@router.get("/custom/{bot_id}")
async def list_custom_bot_logs(
    bot_id: str,
    owner: str = Depends(token_dep),  # any authenticated user; owner derived from Bearer token
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(default=None),
    from_dt: Optional[datetime] = Query(default=None, alias="from"),
    to_dt: Optional[datetime] = Query(default=None, alias="to"),
):
    """Return paginated custom log entries written by modules for a bot."""
    bot_name = _get_bot_name(bot_id)  # resolve bot_id to bot_name; raises 404 if not found
    return get_ch().query_bot_logs(
        bot_name,
        limit=limit,
        offset=offset,
        event_type=event_type,
        from_dt=from_dt,
        to_dt=to_dt,
    )


@router.post("/custom/{bot_id}", status_code=201)
async def write_custom_bot_log(
    bot_id: str,
    body: CustomLogBody,
    owner: str = Depends(token_dep),  # any authenticated user; owner recorded on the log entry
):
    """Write a custom log entry for a bot; intended for module backends to record interactions."""
    bot_name = _get_bot_name(bot_id)  # resolve bot_id to bot_name; raises 404 if not found
    get_ch().write_bot_log(
        bot_name=bot_name,
        owner=owner,
        event_type=body.event_type,
        details=body.details,
        level=body.level,
        name=body.name,
        message=body.message,
    )
    return {"ok": True}
