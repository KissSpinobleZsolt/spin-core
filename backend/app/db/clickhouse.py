import json
from datetime import datetime, timezone
from clickhouse_driver import Client

# HTTP request log — renamed from old app_logs at migration time.
_DDL_API_LOGS = """
CREATE TABLE IF NOT EXISTS api_logs (
    event_time   DateTime64(3) DEFAULT now64(),
    level        LowCardinality(String) DEFAULT 'INFO',
    event_type   LowCardinality(String),
    owner        String DEFAULT '',
    path         String DEFAULT '',
    method       LowCardinality(String) DEFAULT '',
    status_code  Int16 DEFAULT 0,
    duration_ms  Float32 DEFAULT 0,
    message      String DEFAULT '',
    name         String DEFAULT '',
    details      String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""

# Platform / system event log — startup, config changes, health checks.
_DDL_APP_LOGS = """
CREATE TABLE IF NOT EXISTS app_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT 'system',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""

# User lifecycle events — login, create, update, delete.
_DDL_USER_LOGS = """
CREATE TABLE IF NOT EXISTS user_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT '',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""

# Module lifecycle events — scope column identifies the module.
_DDL_MODULE_LOGS = """
CREATE TABLE IF NOT EXISTS module_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    scope       LowCardinality(String),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT '',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY (scope, event_time)
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""

# Platform notifications — owner = user email or 'broadcast' for all users.
_DDL_NOTIFICATIONS = """
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID DEFAULT generateUUIDv4(),
    event_time  DateTime64(3) DEFAULT now64(),
    level       LowCardinality(String) DEFAULT 'INFO',
    title       String DEFAULT '',
    message     String DEFAULT '',
    owner       String DEFAULT 'broadcast',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 7 DAY
"""

# Bot lifecycle events — bot_name column identifies the bot.
_DDL_BOT_LOGS = """
CREATE TABLE IF NOT EXISTS bot_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    bot_name    LowCardinality(String),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT '',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY (bot_name, event_time)
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


class ClickHouseLogAdapter:
    """Manages the 5 fixed ClickHouse log tables and all query operations."""

    def __init__(self, db_url: str) -> None:
        self._client = Client.from_url(db_url)

    def test_connection(self) -> None:
        self._client.execute("SELECT 1")

    # ------------------------------------------------------------------
    # Migration — run once at startup before DDL provisioning
    # ------------------------------------------------------------------

    def run_migrations(self) -> None:
        """Rename legacy tables, drop old MVs, and normalise column names."""
        existing = {r[0] for r in self._client.execute("SHOW TABLES")}

        # Move old HTTP log data into api_logs (preserves all rows)
        if "app_logs" in existing and "api_logs" not in existing:
            self._client.execute("RENAME TABLE app_logs TO api_logs")
            existing.add("api_logs")
            existing.discard("app_logs")

        # Rename user_email → owner in the api_logs table (old schema used user_email)
        if "api_logs" in existing:
            cols = {r[0] for r in self._client.execute("DESCRIBE TABLE api_logs")}
            if "user_email" in cols:
                self._client.execute("ALTER TABLE api_logs RENAME COLUMN user_email TO owner")
            # Add new columns that old app_logs didn't have
            for col, typedef in [("message", "String DEFAULT ''"), ("name", "String DEFAULT ''"), ("details", "String DEFAULT '{}'")]:
                self._client.execute(f"ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS {col} {typedef}")

        # Drop all materialized views — queries go directly to base tables now
        for mv in ("app_logs_mv", "module_logs_mv", "bot_logs_mv"):
            self._client.execute(f"DROP TABLE IF EXISTS {mv}")

        # Rename user_email → owner in the shared lifecycle log tables
        for table in ("module_logs", "bot_logs"):
            if table in existing:
                cols = {r[0] for r in self._client.execute(f"DESCRIBE TABLE {table}")}
                if "user_email" in cols:
                    self._client.execute(f"ALTER TABLE {table} RENAME COLUMN user_email TO owner")

    # ------------------------------------------------------------------
    # DDL provisioning
    # ------------------------------------------------------------------

    def ensure_api_logs(self) -> None:
        self._client.execute(_DDL_API_LOGS)

    def ensure_app_logs(self) -> None:
        self._client.execute(_DDL_APP_LOGS)

    def ensure_user_logs(self) -> None:
        self._client.execute(_DDL_USER_LOGS)

    def ensure_module_logs_table(self) -> None:
        self._client.execute(_DDL_MODULE_LOGS)

    def ensure_bot_logs_table(self) -> None:
        self._client.execute(_DDL_BOT_LOGS)

    def ensure_notifications_table(self) -> None:
        self._client.execute(_DDL_NOTIFICATIONS)

    # ------------------------------------------------------------------
    # Shared query helpers
    # ------------------------------------------------------------------

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

    def _summary_query(
        self,
        table: str,
        extra_filters: list,
        extra_params: dict,
        from_dt,
        to_dt,
        limit: int,
        offset: int,
    ) -> dict:
        """Live GROUP BY aggregate — replaces all *_mv reads."""
        from_dt = from_dt or _month_start()
        to_dt = to_dt or datetime.now(timezone.utc)
        where_parts = ["event_time >= %(from_dt)s", "event_time <= %(to_dt)s"] + extra_filters
        params = {"from_dt": from_dt, "to_dt": to_dt, "limit": limit, "offset": offset, **extra_params}
        where = "WHERE " + " AND ".join(where_parts)
        count_rows = self._client.execute(
            f"SELECT count() FROM (SELECT 1 FROM {table} {where} GROUP BY toStartOfHour(event_time), event_type)",
            params,
        )
        total = count_rows[0][0]
        rows = self._client.execute(
            f"""
            SELECT toStartOfHour(event_time) AS bucket, event_type,
                   count() AS event_count, uniq(owner) AS unique_users
            FROM {table} {where}
            GROUP BY bucket, event_type
            ORDER BY bucket DESC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
        )
        keys = ["bucket", "event_type", "event_count", "unique_users"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    # ------------------------------------------------------------------
    # API (HTTP request) logs
    # ------------------------------------------------------------------

    def write_api_log(
        self,
        level: str,
        event_type: str,
        owner: str,
        path: str,
        method: str,
        status_code: int,
        duration_ms: float,
        message: str = "",
    ) -> None:
        self._client.execute(
            "INSERT INTO api_logs (level, event_type, owner, path, method, status_code, duration_ms, message) VALUES",
            [(level, event_type, owner, path, method, status_code, duration_ms, message)],
        )

    def query_api_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        owner: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if owner:
            extra_filters.append("owner = %(owner)s")
            extra_params["owner"] = owner
        rows, total = self._paginated_query(
            "api_logs",
            "event_time, level, event_type, owner, path, method, status_code, duration_ms, message",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "path", "method", "status_code", "duration_ms", "message"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def query_api_logs_summary(
        self,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        path: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        from_dt = from_dt or _month_start()
        to_dt = to_dt or datetime.now(timezone.utc)
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if path:
            extra_filters.append("path = %(path)s")
            extra_params["path"] = path
        where_parts = ["event_time >= %(from_dt)s", "event_time <= %(to_dt)s"] + extra_filters
        params = {"from_dt": from_dt, "to_dt": to_dt, "limit": limit, "offset": offset, **extra_params}
        where = "WHERE " + " AND ".join(where_parts)
        rows = self._client.execute(
            f"""
            SELECT toStartOfHour(event_time) AS bucket, event_type, path, status_code,
                   count() AS request_count,
                   round(avg(duration_ms), 2) AS avg_duration_ms,
                   max(duration_ms) AS max_duration_ms,
                   countIf(status_code >= 400) AS error_count
            FROM api_logs {where}
            GROUP BY bucket, event_type, path, status_code
            ORDER BY bucket DESC
            LIMIT %(limit)s OFFSET %(offset)s
            """,
            params,
        )
        keys = ["bucket", "event_type", "path", "status_code",
                "request_count", "avg_duration_ms", "max_duration_ms", "error_count"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": len(rows)}

    # ------------------------------------------------------------------
    # App (platform) logs
    # ------------------------------------------------------------------

    def write_app_log(
        self,
        level: str,
        event_type: str,
        owner: str,
        message: str,
        name: str = "",
        details: dict | None = None,
    ) -> None:
        self._client.execute(
            "INSERT INTO app_logs (level, event_type, owner, message, name, details) VALUES",
            [(level, event_type, owner, message, name, json.dumps(details or {}))],
        )

    # ------------------------------------------------------------------
    # User logs
    # ------------------------------------------------------------------

    def write_user_log(
        self,
        level: str,
        event_type: str,
        owner: str,
        message: str,
        name: str = "",
        details: dict | None = None,
    ) -> None:
        self._client.execute(
            "INSERT INTO user_logs (level, event_type, owner, message, name, details) VALUES",
            [(level, event_type, owner, message, name, json.dumps(details or {}))],
        )

    def query_user_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        owner: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        extra_filters: list = []
        extra_params: dict = {}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if owner:
            extra_filters.append("owner = %(owner)s")
            extra_params["owner"] = owner
        rows, total = self._paginated_query(
            "user_logs",
            "event_time, level, event_type, owner, message, name, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "message", "name", "details"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    # ------------------------------------------------------------------
    # Module logs
    # ------------------------------------------------------------------

    def write_module_log(
        self,
        scope: str,
        owner: str,
        event_type: str,
        details: dict,
        *,
        level: str = "INFO",
        name: str = "",
        message: str = "",
    ) -> None:
        self._client.execute(
            "INSERT INTO module_logs (scope, owner, event_type, details, level, name, message) VALUES",
            [(scope, owner, event_type, json.dumps(details), level, name, message)],
        )

    def query_module_logs(
        self,
        scope: str,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        extra_filters: list = ["scope = %(scope)s"]
        extra_params: dict = {"scope": scope}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            "module_logs",
            "event_time, level, event_type, owner, message, name, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "message", "name", "details"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def query_module_logs_summary(
        self,
        scope: str,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        extra_filters: list = ["scope = %(scope)s"]
        extra_params: dict = {"scope": scope}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        return self._summary_query("module_logs", extra_filters, extra_params, from_dt, to_dt, limit, offset)

    # ------------------------------------------------------------------
    # Bot logs
    # ------------------------------------------------------------------

    def write_bot_log(
        self,
        bot_name: str,
        owner: str,
        event_type: str,
        details: dict,
        *,
        level: str = "INFO",
        name: str = "",
        message: str = "",
    ) -> None:
        self._client.execute(
            "INSERT INTO bot_logs (bot_name, owner, event_type, details, level, name, message) VALUES",
            [(bot_name, owner, event_type, json.dumps(details), level, name, message)],
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
        extra_filters: list = ["bot_name = %(bot_name)s"]
        extra_params: dict = {"bot_name": bot_name}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            "bot_logs",
            "event_time, level, event_type, owner, message, name, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "message", "name", "details"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def query_bot_logs_summary(
        self,
        bot_name: str,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        extra_filters: list = ["bot_name = %(bot_name)s"]
        extra_params: dict = {"bot_name": bot_name}
        if event_type:
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        return self._summary_query("bot_logs", extra_filters, extra_params, from_dt, to_dt, limit, offset)

    def get_bot_names_with_logs(self) -> set[str]:
        """Return bot_names that already have at least one entry in bot_logs."""
        rows = self._client.execute("SELECT DISTINCT bot_name FROM bot_logs")
        return {r[0] for r in rows}

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------

    def write_notification(
        self,
        title: str,
        message: str,
        *,
        level: str = "INFO",
        owner: str = "broadcast",
        details: dict | None = None,
    ) -> None:
        self._client.execute(
            "INSERT INTO notifications (level, title, message, owner, details) VALUES",
            [(level, title, message, owner, json.dumps(details or {}))],
        )

    def query_notifications_since(self, owner: str, since: datetime) -> list:
        """Return notifications for owner (or broadcast) inserted after since, oldest-first."""
        rows = self._client.execute(
            """
            SELECT toString(id), event_time, level, title, message, owner, details
            FROM notifications
            WHERE event_time > %(since)s
              AND (owner = %(owner)s OR owner = 'broadcast')
            ORDER BY event_time ASC
            """,
            {"since": since, "owner": owner},
        )
        keys = ["id", "event_time", "level", "title", "message", "owner", "details"]
        return [dict(zip(keys, r)) for r in rows]

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    def optimize_tables(self, _module_scopes: list[str] = []) -> dict:
        """Run OPTIMIZE TABLE FINAL on all 5 base log tables."""
        # _module_scopes kept for callers that still pass scopes; all 5 fixed tables are always optimized
        tables = ["api_logs", "app_logs", "user_logs", "module_logs", "bot_logs"]
        purged: list[str] = []
        errors: list[str] = []
        for table in tables:
            try:
                self._client.execute(f"OPTIMIZE TABLE {table} FINAL")
                purged.append(table)
            except Exception as exc:
                errors.append(f"{table}: {exc}")
        return {"purged": purged, "errors": errors}
