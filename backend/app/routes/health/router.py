import asyncio

import httpx
from fastapi import APIRouter

from app.database import get_pg, get_ch
from app.routes.health.utils import _check_module

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health():
    """Check connectivity to PostgreSQL, ClickHouse, and all registered modules."""
    result: dict = {"api": True, "postgres": False, "clickhouse": False, "translations": {}, "modules": {}}

    try:
        pg = get_pg()
        pg.test_connection()
        result["postgres"] = True
        result["translations"] = pg.get_i18n_versions()
    except Exception:
        pass

    try:
        get_ch().test_connection()
        result["clickhouse"] = True
    except Exception:
        pass

    try:
        modules = get_pg().get_modules(enabled_only=False)
        # Only probe modules that have a remote_url; others have no container to check.
        probeables = [(m["scope"], m["remote_url"]) for m in modules if m.get("remote_url")]
        async with httpx.AsyncClient(timeout=5.0) as client:
            checks = await asyncio.gather(*[_check_module(client, s, u) for s, u in probeables])
        result["modules"] = {scope: online for scope, online in checks}
    except Exception:
        pass

    return result
