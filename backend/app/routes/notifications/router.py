import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth import decode_token
from app.database import get_ch
from app.routes.notifications.constants import _POLL_INTERVAL

router = APIRouter(prefix="/api/notifications", tags=["notifications"])  # mounts the notification WebSocket endpoint


@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket, token: str = Query(...)):
    """Stream new notifications to the client via WebSocket.

    Authenticates via ?token=<jwt>, then polls ClickHouse every 5 s and
    pushes any rows newer than the last seen timestamp as a JSON array.
    """
    try:
        owner = decode_token(token)  # validate the JWT from the query parameter; raises on invalid token
    except Exception:
        await websocket.close(code=1008)  # 1008 Policy Violation: authentication failed
        return

    await websocket.accept()  # upgrade the HTTP connection to a WebSocket
    ch = get_ch()
    last_seen: datetime = datetime.now(timezone.utc)  # anchor the polling window to connection time; avoids replaying old notifications

    try:
        while True:
            rows = ch.query_notifications_since(owner=owner, since=last_seen)  # poll for new notifications since the last check
            if rows:
                last_seen = max(r["event_time"] for r in rows)  # advance the cursor to the most recent notification
                payload = [
                    {**r, "event_time": r["event_time"].isoformat()}  # convert datetime to ISO string for JSON serialisation
                    for r in rows
                ]
                await websocket.send_text(json.dumps(payload))  # push the notification batch to the client
            await asyncio.sleep(_POLL_INTERVAL)  # wait before polling again to avoid hammering ClickHouse
    except WebSocketDisconnect:
        pass  # client disconnected normally; exit the loop without logging an error
