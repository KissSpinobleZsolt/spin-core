from dataclasses import dataclass


@dataclass
class UserRecord:
    """Database-agnostic representation of a user row returned to callers."""
    email: str             # primary identity key; used as the JWT subject claim
    name: str              # display name shown in the UI header
    hashed_password: str   # bcrypt hash; never exposed outside auth helpers
    roles: list[str]       # role slugs (e.g. ["user", "admin"]); controls access to admin routes
    default_theme: str     # preferred UI theme ("dark" or "light"); persisted per user
