from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, jwt

from app.auth.constants import SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_HOURS


def create_token(email: str) -> str:
    """Create a signed JWT for the given email that expires in TOKEN_EXPIRE_HOURS."""
    payload = {
        "sub": email,  # subject claim carries the user identity
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    """Return the email (sub) from the token, or raise HTTP 401."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
