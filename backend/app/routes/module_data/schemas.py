from pydantic import BaseModel


class DocPayload(BaseModel):
    """Request body schema carrying arbitrary JSON data for a module document."""

    data: dict
