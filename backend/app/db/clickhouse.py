import json
from datetime import datetime, timezone
from clickhouse_driver import Client

from app.queries.ch_ddl import (
    CH_DDL_API_LOGS, CH_DDL_APP_LOGS, CH_DDL_USER_LOGS,
    CH_DDL_MODULE_LOGS, CH_DDL_NOTIFICATIONS, CH_DDL_BOT_LOGS,
)
from app.queries.ch_inserts import (
    CH_INSERT_API_LOGS, CH_INSERT_APP_LOGS, CH_INSERT_USER_LOGS,
    CH_INSERT_MODULE_LOGS, CH_INSERT_BOT_LOGS, CH_INSERT_NOTIFICATIONS,
)
from app.queries.ch_selects import (
    CH_TEST_CONNECTION,
    CH_BOT_NAMES_WITH_LOGS, CH_COMPONENT_NAMES_WITH_LOGS, CH_PAGE_ROUTES_WITH_LOGS,
    CH_NOTIFICATIONS_SINCE,
    CH_PAGINATED_COUNT, CH_PAGINATED_ROWS,
    CH_SUMMARY_COUNT, CH_SUMMARY_ROWS,
    CH_API_LOGS_SUMMARY,
)


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


class ClickHouseLogAdapter:
    """Manages the 5 fixed ClickHouse log tables and all query operations."""

    def __init__(self, db_url: str) -> None:
        self._client = Client.from_url(db_url)

    def test_connection(self) -> None:
        self._client.execute(CH_TEST_CONNECTION)

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
        self._client.execute(CH_DDL_API_LOGS)

    def ensure_app_logs(self) -> None:
        self._client.execute(CH_DDL_APP_LOGS)

    def ensure_user_logs(self) -> None:
        self._client.execute(CH_DDL_USER_LOGS)

    def ensure_module_logs_table(self) -> None:
        self._client.execute(CH_DDL_MODULE_LOGS)

    def ensure_bot_logs_table(self) -> None:
        self._client.execute(CH_DDL_BOT_LOGS)

    def ensure_notifications_table(self) -> None:
        self._client.execute(CH_DDL_NOTIFICATIONS)

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
        total = self._client.execute(CH_PAGINATED_COUNT.format(table=table, where=where), params)[0][0]
        params["limit"] = limit
        params["offset"] = offset
        rows = self._client.execute(
            CH_PAGINATED_ROWS.format(select_cols=select_cols, table=table, where=where, order_col=order_col),
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
            CH_SUMMARY_COUNT.format(table=table, where=where),
            params,
        )
        total = count_rows[0][0]
        rows = self._client.execute(
            CH_SUMMARY_ROWS.format(table=table, where=where),
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
            CH_INSERT_API_LOGS,
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
            CH_API_LOGS_SUMMARY.format(where=where),
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
            CH_INSERT_APP_LOGS,
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
            CH_INSERT_USER_LOGS,
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
            CH_INSERT_MODULE_LOGS,
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
            CH_INSERT_BOT_LOGS,
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
        rows = self._client.execute(CH_BOT_NAMES_WITH_LOGS)
        return {r[0] for r in rows}

    def get_component_names_with_logs(self) -> set[str]:
        """Return component names that already have a component.init entry in module_logs (scope='system')."""
        rows = self._client.execute(CH_COMPONENT_NAMES_WITH_LOGS)
        return {r[0] for r in rows}

    def get_page_routes_with_logs(self) -> set[str]:
        """Return page routes that already have a page.init entry in module_logs (scope='system')."""
        rows = self._client.execute(CH_PAGE_ROUTES_WITH_LOGS)
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
            CH_INSERT_NOTIFICATIONS,
            [(level, title, message, owner, json.dumps(details or {}))],
        )

    def query_notifications_since(self, owner: str, since: datetime) -> list:
        """Return notifications for owner (or broadcast) inserted after since, oldest-first."""
        rows = self._client.execute(
            CH_NOTIFICATIONS_SINCE,
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
