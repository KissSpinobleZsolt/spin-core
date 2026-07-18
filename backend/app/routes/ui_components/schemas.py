from pydantic import BaseModel


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
