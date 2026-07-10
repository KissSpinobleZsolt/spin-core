import json
import time
from clickhouse_driver import Client

_DDL = """
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


class ClickHouseLogAdapter:
    def __init__(self, db_url: str) -> None:
        self._client = Client.from_url(db_url)
        self._client.execute(_DDL)

    def test_connection(self) -> None:
        self._client.execute("SELECT 1")

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
    ) -> list[dict]:
        where_parts = []
        params: dict = {}
        if event_type:
            where_parts.append("event_type = %(event_type)s")
            params["event_type"] = event_type
        if user_email:
            where_parts.append("user_email = %(user_email)s")
            params["user_email"] = user_email
        where = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
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
        keys = ["event_time", "level", "event_type", "user_email", "path", "method",
                "status_code", "duration_ms", "details"]
        return [dict(zip(keys, row)) for row in rows]
