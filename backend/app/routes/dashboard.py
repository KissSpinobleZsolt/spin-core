from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.database import get_pg
from app.deps import token_dep

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
async def dashboard(_: str = Depends(token_dep)):
    """Return the dashboard page content stored in the database."""
    content = get_pg().get_page("dashboard")
    if content is None:
        raise HTTPException(status_code=404, detail="Dashboard content not found")
    return {"message": content}


class ThemePayload(BaseModel):
    """Request body schema for updating the authenticated user's theme preference."""

    theme: Literal["dark", "light"]


@router.patch("/user/theme", status_code=204)
async def set_user_theme(payload: ThemePayload, email: str = Depends(token_dep)):
    """Persist the authenticated user's preferred UI theme."""
    get_pg().update_user_theme(email, payload.theme)
    return Response(status_code=204)
