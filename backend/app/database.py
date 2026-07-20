import os

from app.settings import DEFAULT_POSTGRES_URL, DEFAULT_CLICKHOUSE_URL

_pg = None  # PostgresAdapter singleton; set by init_db()
_ch = None  # ClickHouseLogAdapter singleton; set by init_db()
_logger = None  # AppLogger singleton; set by init_logger() after init_db()


def init_db() -> None:
    """Instantiate and store the PostgreSQL and ClickHouse adapter singletons."""
    global _pg, _ch
    from app.db.postgres import PostgresAdapter
    from app.db.clickhouse import ClickHouseLogAdapter
    _pg = PostgresAdapter(os.getenv("POSTGRES_URL", DEFAULT_POSTGRES_URL))  # read DSN from env with a safe default
    _ch = ClickHouseLogAdapter(os.getenv("CLICKHOUSE_URL", DEFAULT_CLICKHOUSE_URL))


def init_logger() -> None:
    """Wrap the ClickHouse adapter in AppLogger and store the singleton.

    Must be called after ``init_db()`` so that ``get_ch()`` is available.
    All startup and route code that writes lifecycle events calls ``get_logger()``
    rather than touching ``get_ch()`` directly.
    """
    global _logger
    from app.logger import AppLogger
    _logger = AppLogger(get_ch())  # AppLogger wraps _ch; CH must already be initialised


def get_pg():
    """Return the PostgresAdapter singleton, raising RuntimeError if not yet initialised."""
    if _pg is None:
        raise RuntimeError("Database not initialised")  # guards against calling before lifespan startup
    return _pg


def get_ch():
    """Return the ClickHouseLogAdapter singleton, raising RuntimeError if not yet initialised."""
    if _ch is None:
        raise RuntimeError("Database not initialised")
    return _ch


def get_logger():
    """Return the AppLogger singleton, raising RuntimeError if not yet initialised."""
    if _logger is None:
        raise RuntimeError("Logger not initialised — call init_logger() after init_db()")  # guards mis-ordered startup
    return _logger
