from fastapi import Header, HTTPException

from app.auth import decode_token


def require_token(authorization: str) -> str:
    """Validate the Bearer token and return the authenticated user's email."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    return decode_token(authorization.removeprefix("Bearer "))


def token_dep(authorization: str = Header(default="")) -> str:  # FastAPI dependency alias for require_token
    return require_token(authorization)
