from fastapi import APIRouter, HTTPException

from app.auth import create_token, verify_password
from app.database import get_pg, get_logger
from app.events import UserEvent
from app.routes.auth.schemas import LoginCredentials

router = APIRouter(prefix="/api/auth", tags=["auth"])  # mounts all auth endpoints under /api/auth


@router.post("/login")
async def login(credentials: LoginCredentials):
    """Authenticate a user with email and password and return a signed JWT with user profile."""
    user = get_pg().get_user_by_email(credentials.email)  # look up the user by email
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")  # use a single message to prevent email enumeration
    token = create_token(user.email)  # issue a signed JWT valid for TOKEN_EXPIRE_HOURS
    get_logger().user(UserEvent.LOGIN, user.email)  # AppLogger swallows exceptions internally; login is never blocked by a CH outage
    return {  # return the token and user profile so the frontend can initialise its auth state
        "token": token,
        "user": {
            "name": user.name,
            "roles": user.roles,
            "defaultTheme": user.default_theme,
        },
    }
