import time
from clickhouse_driver import Client

from app.db.interface import UserRecord

# DDL — ReplacingMergeTree deduplicates on the ORDER BY key, keeping the row
# with the highest _ver value. Reads use FINAL to get the merged result.
_DDL = [
    """
    CREATE TABLE IF NOT EXISTS users (
        email       String,
        name        String,
        hashed_password String,
        roles       Array(String),
        default_theme String,
        _ver        UInt64
    ) ENGINE = ReplacingMergeTree(_ver)
    ORDER BY email
    """,
    """
    CREATE TABLE IF NOT EXISTS pages (
        page_key String,
        content  String,
        _ver     UInt64
    ) ENGINE = ReplacingMergeTree(_ver)
    ORDER BY page_key
    """,
]


def _now() -> int:
    return int(time.time() * 1_000)


class ClickHouseAdapter:
    def __init__(self, db_url: str) -> None:
        self._client = Client.from_url(db_url)
        for stmt in _DDL:
            self._client.execute(stmt)

    def test_connection(self) -> None:
        self._client.execute("SELECT 1")

    def get_user_by_email(self, email: str) -> UserRecord | None:
        rows = self._client.execute(
            "SELECT email, name, hashed_password, roles, default_theme "
            "FROM users FINAL WHERE email = %(email)s",
            {"email": email},
        )
        if not rows:
            return None
        email_, name, hashed_password, roles, default_theme = rows[0]
        return UserRecord(
            email=email_,
            name=name,
            hashed_password=hashed_password,
            roles=list(roles),
            default_theme=default_theme,
        )

    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
        roles: list[str],
        default_theme: str,
    ) -> UserRecord:
        self._client.execute(
            "INSERT INTO users (email, name, hashed_password, roles, default_theme, _ver) VALUES",
            [(email, name, hashed_password, roles, default_theme, _now())],
        )
        return UserRecord(email=email, name=name, hashed_password=hashed_password, roles=roles, default_theme=default_theme)

    def update_user_theme(self, email: str, theme: str) -> None:
        # Re-insert with a fresh _ver so ReplacingMergeTree will keep this row.
        # We fetch current data first to preserve all other fields.
        user = self.get_user_by_email(email)
        if user:
            self._client.execute(
                "INSERT INTO users (email, name, hashed_password, roles, default_theme, _ver) VALUES",
                [(user.email, user.name, user.hashed_password, user.roles, theme, _now())],
            )

    def get_page(self, key: str) -> str | None:
        rows = self._client.execute(
            "SELECT content FROM pages FINAL WHERE page_key = %(key)s",
            {"key": key},
        )
        return rows[0][0] if rows else None

    def upsert_page(self, key: str, content: str) -> None:
        self._client.execute(
            "INSERT INTO pages (page_key, content, _ver) VALUES",
            [(key, content, _now())],
        )
