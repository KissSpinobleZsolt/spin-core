from fastapi import APIRouter, Depends

from app.database import get_pg
from app.deps import token_dep, admin_dep
from app.routes.ui_components.schemas import UIComponentOut, UIComponentPayload

router = APIRouter(prefix="/api/ui-components", tags=["ui-components"])  # mounts UI component catalogue endpoints


@router.get("", response_model=list[UIComponentOut])
def list_ui_components(pg=Depends(get_pg), _=Depends(token_dep)):
    """Return all UI component catalogue entries ordered by sort_order then name."""
    return pg.get_ui_components()  # sorted list of all component docs for the catalogue UI


@router.put("/{name}", response_model=UIComponentOut)
def upsert_ui_component(name: str, body: UIComponentPayload, pg=Depends(get_pg), _=Depends(admin_dep)):
    """Insert or update a UI component catalogue entry by name (admin only)."""
    data = body.model_dump()  # convert the Pydantic model to a plain dict
    data["name"] = name       # enforce the URL path parameter as the canonical name, overriding any body value
    return pg.upsert_ui_component(data)  # delegate the insert-or-update to the Postgres adapter
