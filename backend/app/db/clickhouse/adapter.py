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
    CH_BOT_NAMES_WITH_LOGS, CH_PAGE_ROUTES_WITH_LOGS,
    CH_NOTIFICATIONS_SINCE,
    CH_PAGINATED_COUNT, CH_PAGINATED_ROWS,
    CH_SUMMARY_COUNT, CH_SUMMARY_ROWS,
    CH_API_LOGS_SUMMARY,
)
from app.db.clickhouse.utils import _month_start


class ClickHouseLogAdapter:
    """Manages the 5 fixed ClickHouse log tables and all query operations."""

    def __init__(self, db_url: str) -> None:
        self._client = Client.from_url(db_url)  # parse the DSN and open the synchronous clickhouse-driver connection

    def test_connection(self) -> None:
        self._client.execute(CH_TEST_CONNECTION)  # "SELECT 1" — raises on connection failure

    # ------------------------------------------------------------------
    # Migration — run once at startup before DDL provisioning
    # ------------------------------------------------------------------

    def run_migrations(self) -> None:
        """Rename legacy tables, drop old MVs, and normalise column names."""
        existing = {r[0] for r in self._client.execute("SHOW TABLES")}  # build a set of current table names for O(1) membership tests

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
        self._client.execute(CH_DDL_API_LOGS)  # idempotent CREATE TABLE IF NOT EXISTS for HTTP request logs

    def ensure_app_logs(self) -> None:
        self._client.execute(CH_DDL_APP_LOGS)  # idempotent CREATE TABLE IF NOT EXISTS for platform lifecycle logs

    def ensure_user_logs(self) -> None:
        self._client.execute(CH_DDL_USER_LOGS)  # idempotent CREATE TABLE IF NOT EXISTS for user-event logs

    def ensure_module_logs_table(self) -> None:
        self._client.execute(CH_DDL_MODULE_LOGS)  # idempotent CREATE TABLE IF NOT EXISTS for per-module event logs

    def ensure_bot_logs_table(self) -> None:
        self._client.execute(CH_DDL_BOT_LOGS)  # idempotent CREATE TABLE IF NOT EXISTS for bot-event logs

    def ensure_notifications_table(self) -> None:
        self._client.execute(CH_DDL_NOTIFICATIONS)  # idempotent CREATE TABLE IF NOT EXISTS for platform notifications

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
        from_dt = from_dt or _month_start()  # default lower bound is the start of the current month
        to_dt = to_dt or datetime.now(timezone.utc)  # default upper bound is right now
        where_parts = [f"{time_col} >= %(from_dt)s", f"{time_col} <= %(to_dt)s"] + extra_filters  # build the WHERE clause fragments
        params = {"from_dt": from_dt, "to_dt": to_dt, **extra_params}  # merge time bounds with caller-supplied filter params
        where = "WHERE " + " AND ".join(where_parts)  # join fragments into a complete WHERE clause string
        total = self._client.execute(CH_PAGINATED_COUNT.format(table=table, where=where), params)[0][0]  # run count query; [0][0] extracts the scalar count
        params["limit"] = limit    # add pagination params after the count so count query stays clean
        params["offset"] = offset  # offset for the data page
        rows = self._client.execute(
            CH_PAGINATED_ROWS.format(select_cols=select_cols, table=table, where=where, order_col=order_col),
            params,
        )
        return rows, total  # return the page of rows alongside the pre-computed total for the caller's pagination metadata

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
        from_dt = from_dt or _month_start()  # default lower bound is start of current month
        to_dt = to_dt or datetime.now(timezone.utc)  # default upper bound is now
        where_parts = ["event_time >= %(from_dt)s", "event_time <= %(to_dt)s"] + extra_filters  # build WHERE fragments
        params = {"from_dt": from_dt, "to_dt": to_dt, "limit": limit, "offset": offset, **extra_params}  # merge all query params
        where = "WHERE " + " AND ".join(where_parts)  # assemble the complete WHERE clause
        count_rows = self._client.execute(
            CH_SUMMARY_COUNT.format(table=table, where=where),
            params,
        )
        total = count_rows[0][0]  # scalar row count from the sub-select; used for pagination metadata
        rows = self._client.execute(
            CH_SUMMARY_ROWS.format(table=table, where=where),
            params,
        )
        keys = ["bucket", "event_type", "event_count", "unique_users"]  # column names matching the SELECT order in CH_SUMMARY_ROWS
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}  # zip column names onto each row tuple

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
            [(level, event_type, owner, path, method, status_code, duration_ms, message)],  # single-row batch; tuple order matches INSERT column list
        )

    def query_api_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        owner: str | None = None,
        level: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        extra_filters: list = []  # additional WHERE predicates built from optional query params
        extra_params: dict = {}   # corresponding clickhouse-driver parameter values
        if event_type:  # narrow to a specific event type when the caller filters by it
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if owner:  # narrow to a specific user/owner when the caller filters by it
            extra_filters.append("owner = %(owner)s")
            extra_params["owner"] = owner
        if level:  # narrow to a specific severity level (INFO, WARN, ERROR) when requested
            extra_filters.append("level = %(level)s")
            extra_params["level"] = level
        rows, total = self._paginated_query(
            "api_logs",
            "event_time, level, event_type, owner, path, method, status_code, duration_ms, message",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "path", "method", "status_code", "duration_ms", "message"]  # column names matching the SELECT order
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}  # zip names onto tuples and wrap in the standard paginated envelope

    def query_api_logs_summary(
        self,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        path: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        from_dt = from_dt or _month_start()  # default to start of month when no lower bound is supplied
        to_dt = to_dt or datetime.now(timezone.utc)  # default upper bound is now
        extra_filters: list = []  # optional WHERE predicates
        extra_params: dict = {}   # corresponding parameter values
        if event_type:  # filter by a specific event type when requested
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if path:  # filter by a specific URL path when requested
            extra_filters.append("path = %(path)s")
            extra_params["path"] = path
        where_parts = ["event_time >= %(from_dt)s", "event_time <= %(to_dt)s"] + extra_filters  # combine time bounds with optional filters
        params = {"from_dt": from_dt, "to_dt": to_dt, "limit": limit, "offset": offset, **extra_params}  # single params dict for the driver
        where = "WHERE " + " AND ".join(where_parts)  # assemble the complete WHERE clause
        rows = self._client.execute(
            CH_API_LOGS_SUMMARY.format(where=where),
            params,
        )
        keys = ["bucket", "event_type", "path", "status_code",
                "request_count", "avg_duration_ms", "max_duration_ms", "error_count"]  # column order matches CH_API_LOGS_SUMMARY SELECT
        return {"items": [dict(zip(keys, r)) for r in rows], "total": len(rows)}  # total is the actual row count since summary queries are not pre-counted

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
            [(level, event_type, owner, message, name, json.dumps(details or {}))],  # serialise details to JSON string; ClickHouse stores it as String
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
            [(level, event_type, owner, message, name, json.dumps(details or {}))],  # serialise details to JSON string for ClickHouse String column
        )

    def query_user_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        event_type: str | None = None,
        owner: str | None = None,
        level: str | None = None,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
    ) -> dict:
        extra_filters: list = []  # optional WHERE predicates for user log queries
        extra_params: dict = {}   # corresponding clickhouse-driver parameter values
        if event_type:  # narrow to a specific event type when the caller filters by it
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        if owner:  # narrow to a specific user when the caller filters by it
            extra_filters.append("owner = %(owner)s")
            extra_params["owner"] = owner
        if level:  # narrow to a specific severity level (INFO, WARN, ERROR) when requested
            extra_filters.append("level = %(level)s")
            extra_params["level"] = level
        rows, total = self._paginated_query(
            "user_logs",
            "event_time, level, event_type, owner, message, name, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "message", "name", "details"]  # matches user_logs column order in the SELECT
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}  # zip column names onto row tuples and wrap in the paginated envelope

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
            [(scope, owner, event_type, json.dumps(details), level, name, message)],  # tuple order matches module_logs INSERT column list
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
        extra_filters: list = ["scope = %(scope)s"]  # always filter to the requested module scope
        extra_params: dict = {"scope": scope}          # bind the scope value for the driver
        if event_type:  # further narrow to a specific event type when requested
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            "module_logs",
            "event_time, level, event_type, owner, message, name, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "message", "name", "details"]  # matches module_logs column order in the SELECT
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}  # wrap in paginated envelope

    def query_module_logs_summary(
        self,
        scope: str,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        extra_filters: list = ["scope = %(scope)s"]  # always restrict the summary to the requested module scope
        extra_params: dict = {"scope": scope}          # bind scope value
        if event_type:  # optionally narrow the summary to one event type
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        return self._summary_query("module_logs", extra_filters, extra_params, from_dt, to_dt, limit, offset)  # delegate to shared GROUP BY helper

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
            [(bot_name, owner, event_type, json.dumps(details), level, name, message)],  # tuple order matches bot_logs INSERT column list
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
        extra_filters: list = ["bot_name = %(bot_name)s"]  # always restrict to the requested bot
        extra_params: dict = {"bot_name": bot_name}        # bind bot_name value
        if event_type:  # further narrow to a specific event type when requested
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        rows, total = self._paginated_query(
            "bot_logs",
            "event_time, level, event_type, owner, message, name, details",
            from_dt, to_dt, extra_filters, extra_params, limit, offset,
        )
        keys = ["event_time", "level", "event_type", "owner", "message", "name", "details"]  # matches bot_logs column order in the SELECT
        return {"items": [dict(zip(keys, r)) for r in rows], "total": total}  # wrap in paginated envelope

    def query_bot_logs_summary(
        self,
        bot_name: str,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        event_type: str | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> dict:
        extra_filters: list = ["bot_name = %(bot_name)s"]  # always restrict summary to the requested bot
        extra_params: dict = {"bot_name": bot_name}        # bind bot_name value
        if event_type:  # optionally narrow to one event type
            extra_filters.append("event_type = %(event_type)s")
            extra_params["event_type"] = event_type
        return self._summary_query("bot_logs", extra_filters, extra_params, from_dt, to_dt, limit, offset)  # delegate to shared GROUP BY helper

    def get_bot_names_with_logs(self) -> set[str]:
        """Return bot_names that already have at least one entry in bot_logs."""
        rows = self._client.execute(CH_BOT_NAMES_WITH_LOGS)  # runs DISTINCT query; returns list of 1-tuples
        return {r[0] for r in rows}  # extract first element of each tuple into a set

    def get_page_routes_with_logs(self) -> set[str]:
        """Return page routes that already have a page.init entry in module_logs (scope='system')."""
        rows = self._client.execute(CH_PAGE_ROUTES_WITH_LOGS)  # queries module_logs WHERE scope='system' AND event_type='page.init'
        return {r[0] for r in rows}  # extract the name column from each row tuple

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
            [(level, title, message, owner, json.dumps(details or {}))],  # tuple order matches notifications INSERT column list
        )

    def query_notifications_since(self, owner: str, since: datetime) -> list:
        """Return notifications for owner (or broadcast) inserted after since, oldest-first."""
        rows = self._client.execute(
            CH_NOTIFICATIONS_SINCE,
            {"since": since, "owner": owner},  # bind the cutoff timestamp and owner filter
        )
        keys = ["id", "event_time", "level", "title", "message", "owner", "details"]  # matches the SELECT column order in CH_NOTIFICATIONS_SINCE
        return [dict(zip(keys, r)) for r in rows]  # zip column names onto each row tuple

    # ------------------------------------------------------------------
    # Maintenance
    # ------------------------------------------------------------------

    def optimize_tables(self, _module_scopes: list[str] = []) -> dict:
        """Run OPTIMIZE TABLE FINAL on all 5 base log tables."""
        # _module_scopes kept for callers that still pass scopes; all 5 fixed tables are always optimized
        tables = ["api_logs", "app_logs", "user_logs", "module_logs", "bot_logs"]  # the 5 fixed log tables to compact
        purged: list[str] = []  # names of tables successfully optimised
        errors: list[str] = []  # error strings for tables that failed to optimise
        for table in tables:
            try:
                self._client.execute(f"OPTIMIZE TABLE {table} FINAL")  # FINAL forces a merge of all parts, evicting expired TTL rows
                purged.append(table)  # record success for the response
            except Exception as exc:
                errors.append(f"{table}: {exc}")  # record failure without aborting optimisation of remaining tables
        return {"purged": purged, "errors": errors}  # caller can surface errors in the admin UI
