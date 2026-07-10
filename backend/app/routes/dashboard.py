from typing import Literal

from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel

from app.database import get_adapter
from app.deps import require_token

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
async def dashboard(authorization: str = Header(default="")):
    require_token(authorization)
    content = get_adapter().get_page("dashboard")
    if content is None:
        raise HTTPException(status_code=404, detail="Dashboard content not found")
    return {"message": content}


class ThemePayload(BaseModel):
    theme: Literal["dark", "light"]


@router.patch("/user/theme", status_code=204)
async def set_user_theme(payload: ThemePayload, authorization: str = Header(default="")):
    email = require_token(authorization)
    get_adapter().update_user_theme(email, payload.theme)
    return Response(status_code=204)
