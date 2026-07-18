from fastapi import APIRouter, HTTPException

from app.auth import create_token, verify_password
from app.database import get_pg, get_ch
from app.routes.auth.schemas import LoginCredentials

router = APIRouter(prefix="/api/auth", tags=["auth"])  # mounts all auth endpoints under /api/auth


@router.post("/login")
async def login(credentials: LoginCredentials):
    """Authenticate a user with email and password and return a signed JWT with user profile."""
    user = get_pg().get_user_by_email(credentials.email)  # look up the user by email
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")  # use a single message to prevent email enumeration
    token = create_token(user.email)  # issue a signed JWT valid for TOKEN_EXPIRE_HOURS
    try:
        get_ch().write_user_log("INFO", "user.login", user.email, f"{user.email} logged in.", name=user.email)
    except Exception:
        pass  # log write failures must not block a successful login response
    return {  # return the token and user profile so the frontend can initialise its auth state
        "token": token,
        "user": {
            "name": user.name,
            "roles": user.roles,
            "defaultTheme": user.default_theme,
        },
    }
