from fastapi import APIRouter, Depends, HTTPException, Response

from app.database import get_pg
from app.deps import token_dep
from app.routes.dashboard.schemas import ThemePayload

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
async def dashboard(_: str = Depends(token_dep)):
    """Return the dashboard page content stored in the database."""
    content = get_pg().get_page("dashboard")
    if content is None:
        raise HTTPException(status_code=404, detail="Dashboard content not found")
    return {"message": content}


@router.patch("/user/theme", status_code=204)
async def set_user_theme(payload: ThemePayload, email: str = Depends(token_dep)):
    """Persist the authenticated user's preferred UI theme."""
    get_pg().update_user_theme(email, payload.theme)
    return Response(status_code=204)
