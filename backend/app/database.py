import os

from app.settings import DEFAULT_POSTGRES_URL, DEFAULT_MONGO_URL, DEFAULT_CLICKHOUSE_URL

_pg = None
_ch = None
_mongo = None


def init_db() -> None:
    global _pg, _ch, _mongo
    from app.db.postgres import PostgresAdapter
    from app.db.clickhouse import ClickHouseLogAdapter
    from app.db.mongo import MongoDataAdapter
    _pg = PostgresAdapter(os.getenv("POSTGRES_URL", DEFAULT_POSTGRES_URL))
    _ch = ClickHouseLogAdapter(os.getenv("CLICKHOUSE_URL", DEFAULT_CLICKHOUSE_URL))
    _mongo = MongoDataAdapter(os.getenv("MONGO_URL", DEFAULT_MONGO_URL))


def get_pg():
    if _pg is None:
        raise RuntimeError("Database not initialised")
    return _pg


def get_ch():
    if _ch is None:
        raise RuntimeError("Database not initialised")
    return _ch


def get_mongo():
    if _mongo is None:
        raise RuntimeError("Database not initialised")
    return _mongo
