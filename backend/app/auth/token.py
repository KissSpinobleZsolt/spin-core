from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import JWTError, jwt

from app.auth.constants import SECRET_KEY, ALGORITHM, TOKEN_EXPIRE_HOURS


def create_token(email: str) -> str:
    """Create a signed JWT for the given email that expires in TOKEN_EXPIRE_HOURS."""
    payload = {
        "sub": email,  # subject claim carries the user identity
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),  # expiry set in UTC to avoid timezone drift
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)  # sign with the shared secret using the configured algorithm


def decode_token(token: str) -> str:
    """Return the email (sub) from the token, or raise HTTP 401."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # verify signature and expiry simultaneously
        email: str = payload.get("sub")  # extract the subject claim holding the authenticated user's email
        if not email:  # a token without a sub claim is structurally invalid
            raise HTTPException(status_code=401, detail="Invalid token")
        return email  # return the verified identity to the caller
    except JWTError:  # catches expired, tampered, or wrongly-signed tokens in one handler
        raise HTTPException(status_code=401, detail="Invalid or expired token")
