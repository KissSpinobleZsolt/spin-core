from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import create_token, verify_password
from app.database import get_adapter
from app.state import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginCredentials(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(credentials: LoginCredentials):
    if not get_settings().setup_complete:
        raise HTTPException(status_code=503, detail="Setup not completed")
    user = get_adapter().get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user.email)
    return {
        "token": token,
        "user": {
            "name": user.name,
            "roles": user.roles,
            "defaultTheme": user.default_theme,
        },
    }
