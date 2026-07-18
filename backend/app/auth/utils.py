import bcrypt


def hash_password(plain: str) -> str:  # bcrypt always salts automatically; never store plain text
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:  # constant-time comparison prevents timing attacks
    return bcrypt.checkpw(plain.encode(), hashed.encode())
