from app.db.clickhouse import ClickHouseLogAdapter
from app.events import LogLevel
from app.events.lifecycle import lifecycle_message


class AppLogger:
    """Single entry point for all ClickHouse lifecycle event writes.

    Wraps ``ClickHouseLogAdapter`` so callers never touch the adapter directly.
    Every method silently suppresses exceptions — a CH outage must never degrade
    the API.  Auto-generates human-readable messages via ``lifecycle_message``
    when the caller does not supply one.
    """

    def __init__(self, ch: ClickHouseLogAdapter) -> None:
        self._ch = ch  # store the adapter; all writes go through it

    # ------------------------------------------------------------------
    # Module lifecycle → module_logs table
    # ------------------------------------------------------------------

    def module(
        self,
        event_type: str,
        scope: str,
        name: str,
        owner: str,
        details: dict | None = None,
        *,
        message: str = "",
        level: str = LogLevel.INFO,
    ) -> None:
        """Write a module lifecycle event (create / update / delete / activate / deactivate)."""
        try:
            self._ch.write_module_log(
                scope,
                owner,
                event_type,
                details or {},  # never pass None to the adapter
                level=level,
                name=name,
                message=message or lifecycle_message(event_type, name),  # auto-generate when not supplied
            )
        except Exception:
            pass  # log failures must not propagate to the caller

    # ------------------------------------------------------------------
    # Bot lifecycle → bot_logs table
    # ------------------------------------------------------------------

    def bot(
        self,
        event_type: str,
        bot_name: str,
        owner: str,
        details: dict | None = None,
        *,
        level: str = LogLevel.INFO,
        message: str = "",
    ) -> None:
        """Write a bot lifecycle event (create / update / delete / activate / deactivate / error / abort)."""
        try:
            self._ch.write_bot_log(
                bot_name,
                owner,
                event_type,
                details or {},
                level=level,
                name=bot_name,
                message=message or lifecycle_message(event_type, bot_name),
            )
        except Exception:
            pass

    # ------------------------------------------------------------------
    # User lifecycle → user_logs table
    # ------------------------------------------------------------------

    def user(
        self,
        event_type: str,
        email: str,
        message: str = "",
        details: dict | None = None,
        *,
        name: str = "",  # display name; defaults to email when not provided
    ) -> None:
        """Write a user lifecycle event (login / init / update / delete)."""
        try:
            effective_name = name or email  # fall back to email when display name is unavailable
            self._ch.write_user_log(
                LogLevel.INFO,
                event_type,
                email,
                message or lifecycle_message(event_type, effective_name),
                name=effective_name,
                details=details,
            )
        except Exception:
            pass

    # ------------------------------------------------------------------
    # App / system events → app_logs table
    # ------------------------------------------------------------------

    def app(
        self,
        event_type: str,
        name: str,
        owner: str = "system",
        details: dict | None = None,
        *,
        message: str = "",  # explicit override; use for events whose slug has no template (e.g. "app.start")
    ) -> None:
        """Write an app-level or system lifecycle event (startup, component init, page init)."""
        try:
            self._ch.write_app_log(
                LogLevel.INFO,
                event_type,
                owner,
                message or lifecycle_message(event_type, name),
                name=name,
                details=details,
            )
        except Exception:
            pass

    # ------------------------------------------------------------------
    # HTTP request log → api_logs table (used exclusively by the middleware)
    # ------------------------------------------------------------------

    def request(
        self,
        owner: str,
        path: str,
        method: str,
        status_code: int,
        duration_ms: float,
    ) -> None:
        """Write a single HTTP request entry to api_logs (fired by the middleware on every request)."""
        try:
            self._ch.write_api_log(
                level=LogLevel.INFO,
                event_type="http.request",
                owner=owner,
                path=path,
                method=method,
                status_code=status_code,
                duration_ms=round(duration_ms, 2),  # two decimal places is sufficient precision
            )
        except Exception:
            pass
