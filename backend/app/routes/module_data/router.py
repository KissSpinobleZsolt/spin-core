from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_pg
from app.deps import token_dep
from app.routes.module_data.schemas import DocPayload
from app.routes.module_data.utils import _check_module

router = APIRouter(prefix="/api/module-data", tags=["module-data"])  # mounts module document store endpoints


@router.get("/{module_id}/{collection}")
async def list_documents(
    module_id: str,
    collection: str,
    _: str = Depends(token_dep),
    limit: int = Query(default=50, le=200),
    skip: int = Query(default=0, ge=0),
):
    """Return a paginated list of documents from a named collection within a module."""
    _check_module(module_id)  # raise 404 if the module does not exist
    return get_pg().get_documents(module_id, collection, limit=limit, skip=skip)


@router.post("/{module_id}/{collection}", status_code=201)
async def create_document(
    module_id: str,
    collection: str,
    payload: DocPayload,
    _: str = Depends(token_dep),
):
    """Insert a new document into a module collection and return its generated ID."""
    _check_module(module_id)  # raise 404 if the module does not exist
    inserted_id = get_pg().insert_document(module_id, collection, payload.data)  # insert and get back the generated UUID
    return {"_id": inserted_id}  # return the document ID in a MongoDB-style envelope for client compatibility


@router.put("/{module_id}/{collection}/{doc_id}")
async def update_document(
    module_id: str,
    collection: str,
    doc_id: str,
    payload: DocPayload,
    _: str = Depends(token_dep),
):
    """Replace the data of an existing document in a module collection."""
    _check_module(module_id)  # raise 404 if the module does not exist
    updated = get_pg().update_document(module_id, collection, doc_id, payload.data)  # returns False when doc_id is not found
    if not updated:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"updated": True}  # simple confirmation envelope


@router.delete("/{module_id}/{collection}/{doc_id}", status_code=204)
async def delete_document(
    module_id: str,
    collection: str,
    doc_id: str,
    _: str = Depends(token_dep),
):
    """Delete a document from a module collection by ID."""
    _check_module(module_id)  # raise 404 if the module does not exist
    deleted = get_pg().delete_document(module_id, collection, doc_id)  # returns False when doc_id is not found
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
