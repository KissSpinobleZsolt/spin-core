import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.database import get_pg
from app.deps import token_dep
from app.routes.plugin_proxy.constants import _FORWARD_REQUEST_HEADERS, _STRIP_RESPONSE_HEADERS

router = APIRouter(prefix="/api/plugin", tags=["plugin-proxy"])  # transparent proxy that forwards requests to module-owned backends


@router.api_route("/{scope}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(scope: str, path: str, request: Request, _: str = Depends(token_dep)):
    """Forward the request to the plugin backend registered for the given scope."""
    module = get_pg().get_module_by_scope(scope)  # look up the module by its federation scope
    if not module or not module.get("backend_url"):
        raise HTTPException(status_code=404, detail=f"No plugin backend registered for scope '{scope}'")  # no backend_url means the module is frontend-only

    base = module["backend_url"].rstrip("/")  # strip trailing slash to avoid double-slash in the target URL
    target = f"{base}/{path}"                 # concatenate the plugin's base URL with the forwarded path
    if request.url.query:
        target += f"?{request.url.query}"     # preserve query parameters from the original request

    headers = {k: v for k, v in request.headers.items() if k.lower() in _FORWARD_REQUEST_HEADERS}  # pass only safe, non-hop headers
    body = await request.body()  # read the full request body for forwarding

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.request(request.method, target, headers=headers, content=body)  # forward to the plugin backend

    response_headers = {k: v for k, v in resp.headers.items() if k.lower() not in _STRIP_RESPONSE_HEADERS}  # remove hop-by-hop headers before returning
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)  # relay the plugin's response verbatim
