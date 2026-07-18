import bcrypt


def hash_password(plain: str) -> str:  # bcrypt always salts automatically; never store plain text
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()  # encode to bytes, hash with a fresh salt, decode back to str for DB storage


def verify_password(plain: str, hashed: str) -> bool:  # constant-time comparison prevents timing attacks
    return bcrypt.checkpw(plain.encode(), hashed.encode())  # encode both sides to bytes before comparing; returns True only on match
