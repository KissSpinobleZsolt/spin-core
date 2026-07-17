from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import get_pg
from app.deps import token_dep, admin_dep

router = APIRouter(prefix="/api/ui-components", tags=["ui-components"])


class PropSchema(BaseModel):
    name: str
    type: str
    default: str | None = None
    required: bool = False
    description: str


class UIComponentOut(BaseModel):
    id: str
    name: str
    export: str
    file: str
    description: str
    props: list[PropSchema]
    notes: str | None
    sort_order: int


class UIComponentPayload(BaseModel):
    name: str
    export: str
    file: str
    description: str = ""
    props: list[PropSchema] = []
    notes: str | None = None
    sort_order: int = 0


@router.get("", response_model=list[UIComponentOut])
def list_ui_components(pg=Depends(get_pg), _=Depends(token_dep)):
    return pg.get_ui_components()


@router.put("/{name}", response_model=UIComponentOut)
def upsert_ui_component(name: str, body: UIComponentPayload, pg=Depends(get_pg), _=Depends(admin_dep)):
    data = body.model_dump()
    data["name"] = name
    return pg.upsert_ui_component(data)
