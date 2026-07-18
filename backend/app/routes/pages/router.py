from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_pg
from app.deps import token_dep, admin_dep
from app.routes.pages.schemas import PageConfigPatch

router = APIRouter(prefix="/api/pages", tags=["pages"])  # mounts page registry endpoints under /api/pages


@router.get("")
def list_pages(_: str = Depends(admin_dep)):
    """Return all page_registry entries ordered by route (admin only)."""
    return get_pg().list_pages()  # returns all rows ordered by route for the admin pages table


@router.get("/config")
def get_page_config(route: str = Query(...), _: str = Depends(token_dep)):
    """Return the page registry config for the given route.

    Federation pages (route starts with 'modules/') are resolved from the modules
    table rather than page_registry, so every registered module is automatically
    addressable without a separate seeding step.
    """
    if route.startswith("modules/"):  # federation routes are owned by the modules table, not page_registry
        module_id = route[len("modules/"):]  # strip the "modules/" prefix to get the bare UUID
        mod = get_pg().get_module_by_id(module_id)
        if not mod:
            raise HTTPException(status_code=404, detail="Page not found")
        if not mod.get("enabled", False):
            raise HTTPException(status_code=404, detail="Page disabled")
        return {  # synthesise a PageConfig-shaped dict so callers get a uniform response shape
            "id": mod["id"],
            "route": route,
            "title": mod["name"],
            "type": "federated",  # discriminant consumed by FederatedPage to load the remote
            "component_key": None,  # not used for federation pages — scope/component serve that role
            "remote_url": mod["remote_url"],
            "scope": mod["scope"],
            "component": mod["component"],
            "roles": mod["roles"],
            "skeleton": {"type": "cards"},  # default skeleton for unknown federation layouts
            "enabled": mod["enabled"],
        }

    config = get_pg().get_page_config(route)  # look up the native page in page_registry
    if not config:
        raise HTTPException(status_code=404, detail="Page not found")
    if not config.get("enabled", True):  # default True so freshly seeded pages are visible before an explicit toggle
        raise HTTPException(status_code=404, detail="Page disabled")
    return config  # return the page config dict directly to the caller


@router.patch("/config")
def patch_page_config(body: PageConfigPatch, route: str = Query(...), _: str = Depends(admin_dep)):
    """Update mutable page registry fields (title, roles, skeleton, enabled) for a native page."""
    updated = get_pg().update_page_config(route, body.model_dump(exclude_none=True))  # exclude_none so omitted fields are not overwritten
    if not updated:
        raise HTTPException(status_code=404, detail="Page not found")
    return updated  # return the full updated config dict
