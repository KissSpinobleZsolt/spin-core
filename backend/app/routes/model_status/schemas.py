from pydantic import BaseModel


class PullPayload(BaseModel):
    """Request body schema for initiating an Ollama model pull."""

    name: str  # Ollama model name to pull (e.g. "qwen2.5:7b"); passed directly to /api/pull
