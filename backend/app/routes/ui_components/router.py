from fastapi import APIRouter, Depends

from app.database import get_pg
from app.deps import token_dep, admin_dep
from app.routes.ui_components.schemas import UIComponentOut, UIComponentPayload

router = APIRouter(prefix="/api/ui-components", tags=["ui-components"])


@router.get("", response_model=list[UIComponentOut])
def list_ui_components(pg=Depends(get_pg), _=Depends(token_dep)):
    return pg.get_ui_components()


@router.put("/{name}", response_model=UIComponentOut)
def upsert_ui_component(name: str, body: UIComponentPayload, pg=Depends(get_pg), _=Depends(admin_dep)):
    data = body.model_dump()
    data["name"] = name
    return pg.upsert_ui_component(data)
