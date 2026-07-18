from dataclasses import dataclass


@dataclass
class UserRecord:
    """Database-agnostic representation of a user row returned to callers."""
    email: str
    name: str
    hashed_password: str
    roles: list[str]
    default_theme: str
