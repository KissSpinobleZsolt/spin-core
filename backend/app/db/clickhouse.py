import json
import re
from datetime import datetime, timezone
from clickhouse_driver import Client

_DDL_APP_LOGS = """
CREATE TABLE IF NOT EXISTS app_logs (
    event_time   DateTime64(3) DEFAULT now64(),
    level        LowCardinality(String),
    event_type   LowCardinality(String),
    user_email   String,
    path         String,
    method       LowCardinality(String),
    status_code  Int16,
    duration_ms  Float32,
    details      String
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""

_DDL_APP_LOGS_MV = """
CREATE MATERIALIZED VIEW IF NOT EXISTS app_logs_mv
REFRESH EVERY 10 MINUTE
ENGINE = MergeTree()
ORDER BY (bucket, event_type, status_code)
AS
SELECT
    toStartOfHour(event_time)       AS bucket,
    event_type,
    path,
    status_code,
    count()                         AS request_count,
    round(avg(duration_ms), 2)      AS avg_duration_ms,
    max(duration_ms)                AS max_duration_ms,
    countIf(status_code >= 400)     AS error_count
FROM app_logs
GROUP BY bucket, event_type, path, status_code
"""


def _month_start() -> datetime:
    """Return the UTC datetime for midnight on the first day of the current month."""
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


class ClickHouseLogAdapter:
    """Manages ClickHouse log tables, materialized views, and all query operations."""
    def __init__(self, db_url: str) -> None:
        """Create the ClickHouse client and ensure the app_logs table exists."""
        self._client = Client.from_url(db_url)
        self._client.execute(_DDL_APP_LOGS)

    def test_connection(self) -> None:
        self._client.execute("SELECT 1")

    def ensure_app_logs_mv(self) -> None:
        self._client.execute(_DDL_APP_LOGS_MV)

    def write_log(
        self,
        level: str,
        event_type: str,
        user_email: str,
        path: str,
        method: str,
        status_code: int,
        duration_ms: float,
        details: dict,
    ) -> None:
        """Insert a single HTTP request log entry into the app_logs table."""
        self._client.execute(
            "INSERT INTO app_logs "
            "(level, event_type, user_email, path, method, status_code, duration_ms, details) VALUES",
            [(level, event_type, user_email, path, method, status_code, duration_ms, json.dumps(details))],
        )

    def _paginated_query(
        self,
        table: str,
        select_cols: str,
        from_dt,
        to_dt,
        extra_filters: list,
        extra_params: dict,
        limit: int,
        offset: int,
        order_col: str = "event_time",
        time_col: str = "event_time",
    ):
        """Execute a time-bounded, paginated SELECT and return (rows, total_count)."""
        from_dt = from_dt or _month_start()
        to_dt = to_dt or datetime.now(timezone.utc)
        where_parts = [f"{time_col} >= %(from_dt)s", f"{time_col} <= %(to_dt)s"] + extra_filters
        params = {"from_dt": from_dt, "to_dt": to_dt, **extra_params}
        where = "WHERE " + " AND ".join(where_parts)
        total = self._client.execute(f"SELECT count() FROM {table} {where}", params)[0][0]
        params["limit"] = limit
        params["offset"] = offset
        rows = self._client.execute(
            f"SELECT {select_cols} FROM {table} {where} ORDER BY {order_col} DESC LIMIT %(limit)s OFFSET %(offset)s",
            params,
        )
        return rows, total

    def query_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        user_email: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        """Query app_logs with optional filters and return paginated items and total count."""
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if user_email:
            extra_filters.append("user_email = %(user_email)s")
            extra_params["user_email"] = user_email
        rows, total = self._paginated_query(
            "app_logs",
            "event_time, level, event_type, user_email, path, method, status_code, duration_ms, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "user_email", "path",
                "method", "status_code", "duration_ms", "details"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def query_app_logs_mv(
        self,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        path: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        """Query the hourly aggregate materialized view and return paginated buckets."""
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if path:
            extra_filters.append("path = %(path)s")
            extra_params["path"] = path
        rows, total = self._paginated_query(
            "app_logs_mv",
            "bucket, event_type, path, status_code, request_count, avg_duration_ms, max_duration_ms, error_count",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
            order_col="bucket", time_col="bucket",
        )
        keys = ["bucket", "event_type", "path", "status_code",
                "request_count", "avg_duration_ms", "max_duration_ms", "error_count"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    # --- per-module log tables ---

    @staticmethod
    def _module_table(scope: str) -> str:
        """Return the ClickHouse log table name for the given module scope."""
        safe = re.sub(r"[^a-zA-Z0-9]", "_", scope).lower()
        return f"module_{safe}_logs"

    @staticmethod
    def _module_mv(scope: str) -> str:
        """Return the ClickHouse materialized view name for the given module scope."""
        safe = re.sub(r"[^a-zA-Z0-9]", "_", scope).lower()
        return f"module_{safe}_logs_mv"

    def ensure_module_table(self, scope: str) -> None:
        """Create the per-module event log table for the given scope if it does not exist."""
        table = self._module_table(scope)
        self._client.execute(f"""
            CREATE TABLE IF NOT EXISTS {table} (
                event_time  DateTime64(3) DEFAULT now64(),
                user_email  String,
                event_type  LowCardinality(String),
                details     String
            ) ENGINE = MergeTree()
            ORDER BY event_time
            TTL toDateTime(event_time) + INTERVAL 30 DAY
        """)

    def ensure_module_mv(self, scope: str) -> None:
        """Create the per-module hourly aggregate materialized view if it does not exist."""
        table = self._module_table(scope)
        mv = self._module_mv(scope)
        self._client.execute(f"""
            CREATE MATERIALIZED VIEW IF NOT EXISTS {mv}
            REFRESH EVERY 10 MINUTE
            ENGINE = MergeTree()
            ORDER BY (bucket, event_type)
            AS
            SELECT
                toStartOfHour(event_time)   AS bucket,
                event_type,
                count()                     AS event_count,
                uniq(user_email)            AS unique_users
            FROM {table}
            GROUP BY bucket, event_type
        """)

    def write_module_log(
        self,
        scope: str,
        user_email: str,
        event_type: str,
        details: dict,
    ) -> None:
        """Insert a single event row into the per-module log table."""
        table = self._module_table(scope)
        self._client.execute(
            f"INSERT INTO {table} (user_email, event_type, details) VALUES",
            [(user_email, event_type, json.dumps(details))],
        )

    # --- per-bot log tables ---

    @staticmethod
    def _bot_table(bot_name: str) -> str:
        """Return the ClickHouse log table name for the given bot."""
        # Keyed by name rather than UUID for human-readable table names;
        # if a bot is renamed the old table becomes orphaned and a new one is provisioned on next startup.
        safe = re.sub(r"[^a-zA-Z0-9]", "_", bot_name).lower()
        return f"bot_{safe}_logs"

    @staticmethod
    def _bot_mv(bot_name: str) -> str:
        """Return the ClickHouse materialized view name for the given bot."""
        safe = re.sub(r"[^a-zA-Z0-9]", "_", bot_name).lower()
        return f"bot_{safe}_logs_mv"

    def ensure_bot_table(self, bot_name: str) -> None:
        """Create the per-bot event log table for the given bot name if it does not exist."""
        table = self._bot_table(bot_name)
        self._client.execute(f"""
            CREATE TABLE IF NOT EXISTS {table} (
                event_time  DateTime64(3) DEFAULT now64(),
                user_email  String,
                event_type  LowCardinality(String),
                details     String
            ) ENGINE = MergeTree()
            ORDER BY event_time
            TTL toDateTime(event_time) + INTERVAL 30 DAY
        """)

    def ensure_bot_mv(self, bot_name: str) -> None:
        """Create the per-bot hourly aggregate materialized view if it does not exist."""
        table = self._bot_table(bot_name)
        mv = self._bot_mv(bot_name)
        self._client.execute(f"""
            CREATE MATERIALIZED VIEW IF NOT EXISTS {mv}
            REFRESH EVERY 10 MINUTE
            ENGINE = MergeTree()
            ORDER BY (bucket, event_type)
            AS
            SELECT
                toStartOfHour(event_time)   AS bucket,
                event_type,
                count()                     AS event_count,
                uniq(user_email)            AS unique_users
            FROM {table}
            GROUP BY bucket, event_type
        """)

    def write_bot_log(
        self,
        bot_name: str,
        user_email: str,
        event_type: str,
        details: dict,
    ) -> None:
        """Insert a single event row into the per-bot log table."""
        table = self._bot_table(bot_name)
        self._client.execute(
            f"INSERT INTO {table} (user_email, event_type, details) VALUES",
            [(user_email, event_type, json.dumps(details))],
        )

    def query_bot_logs(
        self,
        bot_name: str,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        """Query a bot's event log table with optional filters and return paginated results."""
        table = self._bot_table(bot_name)
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            table,
            "event_time, user_email, event_type, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "user_email", "event_type", "details"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def query_bot_logs_mv(
        self,
        bot_name: str,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        """Query the hourly aggregate materialized view for a bot and return paginated buckets."""
        mv = self._bot_mv(bot_name)
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            mv,
            "bucket, event_type, event_count, unique_users",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
            order_col="bucket", time_col="bucket",
        )
        keys = ["bucket", "event_type", "event_count", "unique_users"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def query_module_logs(
        self,
        scope: str,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        """Query a module's event log table with optional filters and return paginated results."""
        table = self._module_table(scope)
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            table,
            "event_time, user_email, event_type, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "user_email", "event_type", "details"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def optimize_tables(self, module_scopes: list[str]) -> dict:
        """Run OPTIMIZE TABLE FINAL on app_logs and all per-module log tables."""
        tables = ["app_logs"] + [self._module_table(s) for s in module_scopes]
        purged: list[str] = []
        errors: list[str] = []
        for table in tables:
            try:
                self._client.execute(f"OPTIMIZE TABLE {table} FINAL")
                purged.append(table)
            except Exception as exc:
                errors.append(f"{table}: {exc}")
        return {"purged": purged, "errors": errors}

    def query_module_logs_mv(
        self,
        scope: str,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        """Query the hourly aggregate materialized view for a module and return paginated buckets."""
        mv = self._module_mv(scope)
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            mv,
            "bucket, event_type, event_count, unique_users",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
            order_col="bucket", time_col="bucket",
        )
        keys = ["bucket", "event_type", "event_count", "unique_users"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}
