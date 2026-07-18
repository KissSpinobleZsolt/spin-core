import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")  # signing secret read from env; override in production
ALGORITHM = "HS256"  # JWT signing algorithm; HS256 is symmetric and suits a single-service backend
TOKEN_EXPIRE_HOURS = 24  # token lifetime; long enough for a work day without forcing re-login
