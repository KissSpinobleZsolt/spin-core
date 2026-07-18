from pydantic import BaseModel


class LogPayload(BaseModel):
    """Request body schema for writing a structured event entry to a module log."""

    event_type: str   # event-type slug (e.g. "module.init") written to module_logs.event_type
    details: dict = {}  # arbitrary JSON metadata stored in module_logs.details; empty dict when not needed
