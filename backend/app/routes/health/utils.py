from urllib.parse import urlparse

import httpx


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
