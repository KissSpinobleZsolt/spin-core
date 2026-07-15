from dataclasses import dataclass


@dataclass
class BotRecord:
    id: str
    name: str
    description: str
    type: str
    model: str
    system_prompt: str
    icon: str
    active: bool
    restricted: str
    roles: list[str]
    modules: list[str]
    created_by: str


@dataclass
class UserRecord:
    email: str
    name: str
    hashed_password: str
    roles: list[str]
    default_theme: str


