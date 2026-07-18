import asyncio

import httpx
from fastapi import APIRouter

from app.database import get_pg, get_ch
from app.routes.health.utils import _check_module

router = APIRouter(prefix="/api/health", tags=["health"])  # mounts the health check endpoint under /api/health


@router.get("")
async def health():
    """Check connectivity to PostgreSQL, ClickHouse, and all registered modules."""
    result: dict = {"api": True, "postgres": False, "clickhouse": False, "translations": {}, "modules": {}}  # initialise with api=True since the route is reachable

    try:
        pg = get_pg()
        pg.test_connection()             # open a connection; raises on DB unreachable
        result["postgres"] = True        # mark postgres healthy on success
        result["translations"] = pg.get_i18n_versions()  # include i18n version map for the frontend cache check
    except Exception:
        pass  # leave postgres=False; the caller can surface the failure in the status UI

    try:
        get_ch().test_connection()    # executes "SELECT 1"; raises on ClickHouse unreachable
        result["clickhouse"] = True   # mark clickhouse healthy on success
    except Exception:
        pass  # leave clickhouse=False

    try:
        modules = get_pg().get_modules(enabled_only=False)  # check all modules, not just enabled ones
        # Only probe modules that have a remote_url; others have no container to check.
        probeables = [(m["scope"], m["remote_url"]) for m in modules if m.get("remote_url")]
        async with httpx.AsyncClient(timeout=5.0) as client:
            checks = await asyncio.gather(*[_check_module(client, s, u) for s, u in probeables])  # fan-out probes in parallel
        result["modules"] = {scope: online for scope, online in checks}  # build scope → bool map
    except Exception:
        pass  # leave modules as empty dict on any error

    return result  # return the combined health snapshot to the caller
