import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.database import get_pg
from app.deps import token_dep
from app.routes.plugin_proxy.constants import _FORWARD_REQUEST_HEADERS, _STRIP_RESPONSE_HEADERS

router = APIRouter(prefix="/api/plugin", tags=["plugin-proxy"])


@router.api_route("/{scope}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(scope: str, path: str, request: Request, _: str = Depends(token_dep)):
    module = get_pg().get_module_by_scope(scope)
    if not module or not module.get("backend_url"):
        raise HTTPException(status_code=404, detail=f"No plugin backend registered for scope '{scope}'")

    base = module["backend_url"].rstrip("/")
    target = f"{base}/{path}"
    if request.url.query:
        target += f"?{request.url.query}"

    headers = {k: v for k, v in request.headers.items() if k.lower() in _FORWARD_REQUEST_HEADERS}
    body = await request.body()

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.request(request.method, target, headers=headers, content=body)

    response_headers = {k: v for k, v in resp.headers.items() if k.lower() not in _STRIP_RESPONSE_HEADERS}
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)
