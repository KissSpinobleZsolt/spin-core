from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.database import get_pg
from app.deps import token_dep

router = APIRouter(prefix="/api/module-data", tags=["module-data"])


def _check_module(module_id: str) -> None:
    if not get_pg().get_module(module_id):
        raise HTTPException(status_code=404, detail="Module not found")


class DocPayload(BaseModel):
    data: dict


@router.get("/{module_id}/{collection}")
async def list_documents(
    module_id: str,
    collection: str,
    _: str = Depends(token_dep),
    limit: int = Query(default=50, le=200),
    skip: int = Query(default=0, ge=0),
):
    _check_module(module_id)
    return get_pg().get_documents(module_id, collection, limit=limit, skip=skip)


@router.post("/{module_id}/{collection}", status_code=201)
async def create_document(
    module_id: str,
    collection: str,
    payload: DocPayload,
    _: str = Depends(token_dep),
):
    _check_module(module_id)
    inserted_id = get_pg().insert_document(module_id, collection, payload.data)
    return {"_id": inserted_id}


@router.put("/{module_id}/{collection}/{doc_id}")
async def update_document(
    module_id: str,
    collection: str,
    doc_id: str,
    payload: DocPayload,
    _: str = Depends(token_dep),
):
    _check_module(module_id)
    updated = get_pg().update_document(module_id, collection, doc_id, payload.data)
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"updated": True}


@router.delete("/{module_id}/{collection}/{doc_id}", status_code=204)
async def delete_document(
    module_id: str,
    collection: str,
    doc_id: str,
    _: str = Depends(token_dep),
):
    _check_module(module_id)
    deleted = get_pg().delete_document(module_id, collection, doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
