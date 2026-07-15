from dataclasses import dataclass
from datetime import datetime


@dataclass
class BotRecord:
    """Database-agnostic representation of a bot row returned to callers."""
    id: str
    name: str
    description: str
    type: str
    model: str
    system_prompt: str
    icon: str
    active: bool
    restricted: str
    modules: list[str]
    created_by: str
    created_at: datetime | None = None


@dataclass
class UserRecord:
    """Database-agnostic representation of a user row returned to callers."""
    email: str
    name: str
    hashed_password: str
    roles: list[str]
    default_theme: str


