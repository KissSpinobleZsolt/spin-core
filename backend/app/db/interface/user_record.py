from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class UserRecord:
    """Database-agnostic representation of a user row returned to callers."""
    email: str              # primary identity key; used as the JWT subject claim
    name: str               # display name shown in the UI header
    hashed_password: str    # bcrypt hash; never exposed outside auth helpers
    roles: list[str]        # role slugs (e.g. ["user", "admin"]); controls access to admin routes
    default_theme: str      # preferred UI theme ("dark" or "light"); persisted per user
    # audit — optional so existing instantiation sites without these args still work
    owner: str = "system"              # current responsible party; 'system' for seed/auto-created users
    created_by: str = "system"         # immutable creator identity
    updated_by: str | None = None      # identity of last editor; None until first explicit update
    created_on: datetime | None = None # server-set creation timestamp
    updated_on: datetime | None = None # None until first explicit edit
