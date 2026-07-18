from fastapi import Header, HTTPException

from app.database import get_pg
from app.deps.token import require_token


def require_admin(authorization: str) -> str:
    """Validate the Bearer token and raise HTTP 403 if the user does not have the admin role."""
    email = require_token(authorization)
    user = get_pg().get_user_by_email(email)
    if not user or "admin" not in user.roles:
        raise HTTPException(status_code=403, detail="Admin role required")
    return email


def admin_dep(authorization: str = Header(default="")) -> str:  # FastAPI dependency alias for require_admin
    return require_admin(authorization)
