from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.database import get_pg
from app.deps import token_dep

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
async def dashboard(_: str = Depends(token_dep)):
    content = get_pg().get_page("dashboard")
    if content is None:
        raise HTTPException(status_code=404, detail="Dashboard content not found")
    return {"message": content}


class ThemePayload(BaseModel):
    theme: Literal["dark", "light"]


@router.patch("/user/theme", status_code=204)
async def set_user_theme(payload: ThemePayload, email: str = Depends(token_dep)):
    get_pg().update_user_theme(email, payload.theme)
    return Response(status_code=204)
