import asyncio
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter

from app.database import get_pg, get_ch

router = APIRouter(prefix="/api/health", tags=["health"])


async def _check_module(client: httpx.AsyncClient, scope: str, remote_url: str) -> tuple[str, bool]:
    # remote_url points to remoteEntry.js; strip the path and probe /manifest.json —
    # a lightweight JSON file every module dev server exposes, same strategy as the background health checker.
    parsed = urlparse(remote_url)
    manifest_url = f"{parsed.scheme}://{parsed.netloc}/manifest.json"
    try:
        resp = await client.get(manifest_url)
        resp.raise_for_status()
        return scope, True
    except Exception:
        return scope, False


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
