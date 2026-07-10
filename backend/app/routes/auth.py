from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import create_token, verify_password
from app.database import get_pg, get_ch

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginCredentials(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(credentials: LoginCredentials):
    user = get_pg().get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user.email)
    try:
        get_ch().write_log("INFO", "auth.login", user.email, "/api/auth/login", "POST", 200, 0, {})
    except Exception:
        pass
    return {
        "token": token,
        "user": {
            "name": user.name,
            "roles": user.roles,
            "defaultTheme": user.default_theme,
        },
    }
