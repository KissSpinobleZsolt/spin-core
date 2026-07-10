from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from app.database import get_mongo
from app.deps import require_token
from app.state import get_settings

router = APIRouter(prefix="/api/module-data", tags=["module-data"])


def _check_module(module_id: str) -> None:
    ids = {m.id for m in get_settings().modules}
    if module_id not in ids:
        raise HTTPException(status_code=404, detail="Module not found")


class DocPayload(BaseModel):
    data: dict


@router.get("/{module_id}/{collection}")
async def list_documents(
    module_id: str,
    collection: str,
    authorization: str = Header(default=""),
    limit: int = Query(default=50, le=200),
    skip: int = Query(default=0, ge=0),
):
    require_token(authorization)
    _check_module(module_id)
    return get_mongo().get_documents(module_id, collection, {}, limit=limit, skip=skip)


@router.post("/{module_id}/{collection}", status_code=201)
async def create_document(
    module_id: str,
    collection: str,
    payload: DocPayload,
    authorization: str = Header(default=""),
):
    require_token(authorization)
    _check_module(module_id)
    inserted_id = get_mongo().insert_document(module_id, collection, payload.data)
    return {"_id": inserted_id}


@router.put("/{module_id}/{collection}/{doc_id}")
async def update_document(
    module_id: str,
    collection: str,
    doc_id: str,
    payload: DocPayload,
    authorization: str = Header(default=""),
):
    require_token(authorization)
    _check_module(module_id)
    updated = get_mongo().update_document(module_id, collection, doc_id, payload.data)
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"updated": True}


@router.delete("/{module_id}/{collection}/{doc_id}", status_code=204)
async def delete_document(
    module_id: str,
    collection: str,
    doc_id: str,
    authorization: str = Header(default=""),
):
    require_token(authorization)
    _check_module(module_id)
    deleted = get_mongo().delete_document(module_id, collection, doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
