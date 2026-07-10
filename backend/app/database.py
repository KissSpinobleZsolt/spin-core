from app.db.interface import DBAdapter
from app.settings import AppSettings

_adapter: DBAdapter | None = None


def init_db(settings: AppSettings) -> None:
    global _adapter
    if settings.db_type == "postgres":
        from app.db.postgres import PostgresAdapter
        _adapter = PostgresAdapter(settings.db_url)
    elif settings.db_type == "mongodb":
        from app.db.mongo import MongoAdapter
        _adapter = MongoAdapter(settings.db_url)
    else:
        from app.db.clickhouse import ClickHouseAdapter
        _adapter = ClickHouseAdapter(settings.db_url)


def get_adapter() -> DBAdapter:
    if _adapter is None:
        raise RuntimeError("Database not initialised — complete setup first")
    return _adapter
