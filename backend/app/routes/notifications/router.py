import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth import decode_token
from app.database import get_ch
from app.routes.notifications.constants import _POLL_INTERVAL

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, token: str = Query(...)):
    """Stream new notifications to the client via WebSocket.

    Authenticates via ?token=<jwt>, then polls ClickHouse every 5 s and
    pushes any rows newer than the last seen timestamp as a JSON array.
    """
    try:
        owner = decode_token(token)
    except Exception:
        await websocket.close(code=1008)
        return

    await websocket.accept()
    ch = get_ch()
    last_seen: datetime = datetime.now(timezone.utc)

    try:
        while True:
            rows = ch.query_notifications_since(owner=owner, since=last_seen)
            if rows:
                last_seen = max(r["event_time"] for r in rows)
                payload = [
                    {**r, "event_time": r["event_time"].isoformat()}
                    for r in rows
                ]
                await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(_POLL_INTERVAL)
    except WebSocketDisconnect:
        pass
