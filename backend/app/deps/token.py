from fastapi import Header, HTTPException

from app.auth import decode_token


def require_token(authorization: str) -> str:
    """Validate the Bearer token and return the authenticated user's email."""
    if not authorization.startswith("Bearer "):  # reject headers that do not use the Bearer scheme
        raise HTTPException(status_code=401, detail="Missing token")  # 401 tells the client to supply a valid credential
    return decode_token(authorization.removeprefix("Bearer "))  # strip scheme prefix and delegate to JWT validation


def token_dep(authorization: str = Header(default="")) -> str:  # FastAPI dependency alias for require_token
    return require_token(authorization)  # pass the raw header value to the shared validator
