from dataclasses import dataclass
from typing import Protocol


@dataclass
class BotRecord:
    id: str
    name: str
    description: str
    type: str
    model: str
    system_prompt: str
    icon: str
    enabled: bool
    roles: list[str]


@dataclass
class UserRecord:
    email: str
    name: str
    hashed_password: str
    roles: list[str]
    default_theme: str


class AppAdapter(Protocol):
    def get_user_by_email(self, email: str) -> UserRecord | None: ...
    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
        roles: list[str],
        default_theme: str,
    ) -> UserRecord: ...
    def update_user_theme(self, email: str, theme: str) -> None: ...
    def get_page(self, key: str) -> str | None: ...
    def upsert_page(self, key: str, content: str) -> None: ...
    def test_connection(self) -> None: ...
