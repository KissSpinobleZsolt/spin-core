from pydantic import BaseModel


class DocPayload(BaseModel):
    """Request body schema carrying arbitrary JSON data for a module document."""

    data: dict  # arbitrary JSON payload; stored verbatim in module_documents.data
