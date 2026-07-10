from fastapi import APIRouter, Header, Query

from app.database import get_ch
from app.deps import require_admin

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
async def get_logs(
    authorization: str = Header(default=""),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    event_type: str | None = Query(default=None),
    user_email: str | None = Query(default=None),
):
    require_admin(authorization)
    return get_ch().query_logs(limit=limit, offset=offset, event_type=event_type, user_email=user_email)
