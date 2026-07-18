from fastapi import Header, HTTPException

from app.database import get_pg
from app.deps.token import require_token


def require_admin(authorization: str) -> str:
    """Validate the Bearer token and raise HTTP 403 if the user does not have the admin role."""
    email = require_token(authorization)  # first verify the token is valid and extract the caller's email
    user = get_pg().get_user_by_email(email)  # look up the full user record to read their assigned roles
    if not user or "admin" not in user.roles:  # absent user and missing role are both treated as a permission failure
        raise HTTPException(status_code=403, detail="Admin role required")  # 403 means authenticated but not authorised
    return email  # return the verified admin email for optional downstream use by the route handler


def admin_dep(authorization: str = Header(default="")) -> str:  # FastAPI dependency alias for require_admin
    return require_admin(authorization)  # delegate to the shared implementation
