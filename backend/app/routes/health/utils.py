from urllib.parse import urlparse

import httpx


async def _check_module(client: httpx.AsyncClient, scope: str, remote_url: str) -> tuple[str, bool]:
    # remote_url points to remoteEntry.js; strip the path and probe /manifest.json —
    # a lightweight JSON file every module dev server exposes, same strategy as the background health checker.
    parsed = urlparse(remote_url)  # parse the remoteEntry.js URL to extract scheme and netloc
    manifest_url = f"{parsed.scheme}://{parsed.netloc}/manifest.json"  # construct the manifest probe URL from the same origin
    try:
        resp = await client.get(manifest_url)  # send a GET request with the shared 5-second timeout
        resp.raise_for_status()               # treat any 4xx/5xx as unreachable
        return scope, True   # module responded with a valid status; mark as online
    except Exception:
        return scope, False  # any error (timeout, connection refused, non-2xx) marks the module offline
