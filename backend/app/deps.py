from fastapi import Header, HTTPException

from app.auth import decode_token
from app.database import get_pg


def require_token(authorization: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    return decode_token(authorization.removeprefix("Bearer "))


def require_admin(authorization: str) -> str:
    email = require_token(authorization)
    user = get_pg().get_user_by_email(email)
    if not user or "admin" not in user.roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    return email


def token_dep(authorization: str = Header(default="")) -> str:
    return require_token(authorization)


def admin_dep(authorization: str = Header(default="")) -> str:
    return require_admin(authorization)
