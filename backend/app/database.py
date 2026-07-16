import os

from app.settings import DEFAULT_POSTGRES_URL, DEFAULT_CLICKHOUSE_URL

_pg = None
_ch = None


def init_db() -> None:
    """Instantiate and store the PostgreSQL and ClickHouse adapter singletons."""
    global _pg, _ch
    from app.db.postgres import PostgresAdapter
    from app.db.clickhouse import ClickHouseLogAdapter
    _pg = PostgresAdapter(os.getenv("POSTGRES_URL", DEFAULT_POSTGRES_URL))
    _ch = ClickHouseLogAdapter(os.getenv("CLICKHOUSE_URL", DEFAULT_CLICKHOUSE_URL))


def get_pg():
    """Return the PostgresAdapter singleton, raising RuntimeError if not yet initialised."""
    if _pg is None:
        raise RuntimeError("Database not initialised")
    return _pg


def get_ch():
    """Return the ClickHouseLogAdapter singleton, raising RuntimeError if not yet initialised."""
    if _ch is None:
        raise RuntimeError("Database not initialised")
    return _ch
