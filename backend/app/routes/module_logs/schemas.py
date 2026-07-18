from pydantic import BaseModel


class LogPayload(BaseModel):
    """Request body schema for writing a structured event entry to a module log."""

    event_type: str
    details: dict = {}
