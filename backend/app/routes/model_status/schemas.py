from pydantic import BaseModel


class PullPayload(BaseModel):
    """Request body schema for initiating an Ollama model pull."""

    name: str
