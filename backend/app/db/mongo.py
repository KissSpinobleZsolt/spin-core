import pymongo
from pymongo import MongoClient

from app.db.interface import UserRecord


class MongoAdapter:
    def __init__(self, db_url: str) -> None:
        self._client = MongoClient(db_url, serverSelectionTimeoutMS=5000)
        db_name = self._client.get_default_database().name if "?" not in db_url else db_url.split("/")[-1].split("?")[0]
        self._db = self._client[db_name]
        self._users = self._db["users"]
        self._pages = self._db["pages"]
        self._users.create_index("email", unique=True)

    def test_connection(self) -> None:
        self._client.admin.command("ping")

    def get_user_by_email(self, email: str) -> UserRecord | None:
        doc = self._users.find_one({"email": email})
        if not doc:
            return None
        return UserRecord(
            email=doc["email"],
            name=doc["name"],
            hashed_password=doc["hashed_password"],
            roles=doc.get("roles", []),
            default_theme=doc.get("default_theme", "dark"),
        )

    def create_user(
        self,
        email: str,
        name: str,
        hashed_password: str,
        roles: list[str],
        default_theme: str,
    ) -> UserRecord:
        self._users.insert_one(
            {
                "email": email,
                "name": name,
                "hashed_password": hashed_password,
                "roles": roles,
                "default_theme": default_theme,
            }
        )
        return UserRecord(email=email, name=name, hashed_password=hashed_password, roles=roles, default_theme=default_theme)

    def update_user_theme(self, email: str, theme: str) -> None:
        self._users.update_one({"email": email}, {"$set": {"default_theme": theme}})

    def get_page(self, key: str) -> str | None:
        doc = self._pages.find_one({"key": key})
        return doc["content"] if doc else None

    def upsert_page(self, key: str, content: str) -> None:
        self._pages.update_one(
            {"key": key},
            {"$set": {"key": key, "content": content}},
            upsert=True,
        )
