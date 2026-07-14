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
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


class ClickHouseLogAdapter:
    def __init__(self, db_url: str) -> None:
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
        self._client.execute(
            "INSERT INTO app_logs "
            "(level, event_type, user_email, path, method, status_code, duration_ms, details) VALUES",
            [(level, event_type, user_email, path, method, status_code, duration_ms, json.dumps(details))],
        )

    def query_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        user_email: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        from_dt = from_dt or _month_start()
        to_dt = to_dt or datetime.now(timezone.utc)
        where_parts = [
            "event_time >= %(from_dt)s",
            "event_time <= %(to_dt)s",
        ]
        params: dict = {"from_dt": from_dt, "to_dt": to_dt}
        if event_type:
            where_parts.append("event_type = %(event_type)s")
            params["event_type"] = event_type
        if user_email:
            where_parts.append("user_email = %(user_email)s")
            params["user_email"] = user_email
        where = "WHERE " + " AND ".join(where_parts)
        total = self._client.execute(
            f"SELECT count() FROM app_logs {where}", params
        )[0][0]
        params["limit"] = limit
        params["offset"] = offset
        rows = self._client.execute(
            f"SELECT event_time, level, event_type, user_email, path, method, "
            f"status_code, duration_ms, details "
            f"FROM app_logs {where} "
            f"ORDER BY event_time DESC "
            f"LIMIT %(limit)s OFFSET %(offset)s",
            params,
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
        from_dt = from_dt or _month_start()
        to_dt = to_dt or datetime.now(timezone.utc)
        where_parts = [
            "bucket >= %(from_dt)s",
            "bucket <= %(to_dt)s",
        ]
        params: dict = {"from_dt": from_dt, "to_dt": to_dt}
        if event_type:
            where_parts.append("event_type = %(event_type)s")
            params["event_type"] = event_type
        if path:
            where_parts.append("path = %(path)s")
            params["path"] = path
        where = "WHERE " + " AND ".join(where_parts)
        total = self._client.execute(
            f"SELECT count() FROM app_logs_mv {where}", params
        )[0][0]
        params["limit"] = limit
        params["offset"] = offset
        rows = self._client.execute(
            f"SELECT bucket, event_type, path, status_code, "
            f"request_count, avg_duration_ms, max_duration_ms, error_count "
            f"FROM app_logs_mv {where} "
            f"ORDER BY bucket DESC "
            f"LIMIT %(limit)s OFFSET %(offset)s",
            params,
        )
        keys = ["bucket", "event_type", "path", "status_code",
                "request_count", "avg_duration_ms", "max_duration_ms", "error_count"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    # --- per-module log tables ---

    @staticmethod
    def _module_table(scope: str) -> str:
        safe = re.sub(r"[^a-zA-Z0-9]", "_", scope).lower()
        return f"module_{safe}_logs"

    @staticmethod
    def _module_mv(scope: str) -> str:
        safe = re.sub(r"[^a-zA-Z0-9]", "_", scope).lower()
        return f"module_{safe}_logs_mv"

    def ensure_module_table(self, scope: str) -> None:
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
        table = self._module_table(scope)
        self._client.execute(
            f"INSERT INTO {table} (user_email, event_type, details) VALUES",
            [(user_email, event_type, json.dumps(details))],
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
        table = self._module_table(scope)
        from_dt = from_dt or _month_start()
        to_dt = to_dt or datetime.now(timezone.utc)
        where_parts = [
            "event_time >= %(from_dt)s",
            "event_time <= %(to_dt)s",
        ]
        params: dict = {"from_dt": from_dt, "to_dt": to_dt}
        if event_type:
            where_parts.append("event_type = %(event_type)s")
            params["event_type"] = event_type
        where = "WHERE " + " AND ".join(where_parts)
        total = self._client.execute(
            f"SELECT count() FROM {table} {where}", params
        )[0][0]
        params["limit"] = limit
        params["offset"] = offset
        rows = self._client.execute(
            f"SELECT event_time, user_email, event_type, details "
            f"FROM {table} {where} "
            f"ORDER BY event_time DESC "
            f"LIMIT %(limit)s OFFSET %(offset)s",
            params,
        )
        keys = ["event_time", "user_email", "event_type", "details"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}

    def query_module_logs_mv(
        self,
        scope: str,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        mv = self._module_mv(scope)
        from_dt = from_dt or _month_start()
        to_dt = to_dt or datetime.now(timezone.utc)
        where_parts = [
            "bucket >= %(from_dt)s",
            "bucket <= %(to_dt)s",
        ]
        params: dict = {"from_dt": from_dt, "to_dt": to_dt}
        if event_type:
            where_parts.append("event_type = %(event_type)s")
            params["event_type"] = event_type
        where = "WHERE " + " AND ".join(where_parts)
        total = self._client.execute(
            f"SELECT count() FROM {mv} {where}", params
        )[0][0]
        params["limit"] = limit
        params["offset"] = offset
        rows = self._client.execute(
            f"SELECT bucket, event_type, event_count, unique_users "
            f"FROM {mv} {where} "
            f"ORDER BY bucket DESC "
            f"LIMIT %(limit)s OFFSET %(offset)s",
            params,
        )
        keys = ["bucket", "event_type", "event_count", "unique_users"]
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}
