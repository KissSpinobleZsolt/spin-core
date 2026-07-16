from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.database import get_pg
from app.deps import token_dep, admin_dep

router = APIRouter(prefix="/api/pages", tags=["pages"])


class PageConfigPatch(BaseModel):
    title: Optional[str] = None
    roles: Optional[list[str]] = None
    skeleton: Optional[dict] = None
    enabled: Optional[bool] = None


@router.get("/config")
def get_page_config(route: str = Query(...), _: str = Depends(token_dep)):
    """Return the page registry config for the given route.

    Federation pages (route starts with 'modules/') are resolved from the modules
    table rather than page_registry, so every registered module is automatically
    addressable without a separate seeding step.
    """
    if route.startswith("modules/"):
        module_id = route[len("modules/"):]
        mod = get_pg().get_module_by_id(module_id)
        if not mod:
            raise HTTPException(status_code=404, detail="Page not found")
        if not mod.get("enabled", False):
            raise HTTPException(status_code=404, detail="Page disabled")
        return {
            "id": mod["id"],
            "route": route,
            "title": mod["name"],
            "type": "federated",
            "component_key": None,
            "remote_url": mod["remote_url"],
            "scope": mod["scope"],
            "component": mod["component"],
            "roles": mod["roles"],
            "skeleton": {"type": "cards"},
            "enabled": mod["enabled"],
        }

    config = get_pg().get_page_config(route)
    if not config:
        raise HTTPException(status_code=404, detail="Page not found")
    if not config.get("enabled", True):
        raise HTTPException(status_code=404, detail="Page disabled")
    return config


@router.patch("/config")
def patch_page_config(body: PageConfigPatch, route: str = Query(...), _: str = Depends(admin_dep)):
    """Update mutable page registry fields (title, roles, skeleton, enabled) for a native page."""
    updated = get_pg().update_page_config(route, body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Page not found")
    return updated
