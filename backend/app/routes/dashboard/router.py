from fastapi import APIRouter, Depends, HTTPException, Response

from app.database import get_pg
from app.deps import token_dep
from app.routes.dashboard.schemas import ThemePayload

router = APIRouter(prefix="/api", tags=["dashboard"])  # mounts dashboard and user-preference endpoints under /api


@router.get("/dashboard")
async def dashboard(_: str = Depends(token_dep)):
    """Return the dashboard page content stored in the database."""
    content = get_pg().get_page("dashboard")  # look up the "dashboard" page key in page_responses
    if content is None:
        raise HTTPException(status_code=404, detail="Dashboard content not found")  # missing on a fresh DB before seeding
    return {"message": content}  # wrap content in the legacy "message" envelope the frontend expects


@router.patch("/user/theme", status_code=204)
async def set_user_theme(payload: ThemePayload, email: str = Depends(token_dep)):
    """Persist the authenticated user's preferred UI theme."""
    get_pg().update_user_theme(email, payload.theme)  # update the user's default_theme column in Postgres
    return Response(status_code=204)  # 204 No Content; no response body needed for a preference update
