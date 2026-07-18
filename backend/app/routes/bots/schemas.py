from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class BotPayload(BaseModel):
    """Request body schema for creating or updating a bot.

    Attributes:
        provider: LLM backend to use — ``"ollama"`` (default), ``"anthropic"``,
            or ``"openai"``.  Determines which provider adapter the chat route
            selects at inference time.
        model: Provider-specific model identifier (e.g. ``"qwen2.5:7b"`` for Ollama,
            ``"claude-sonnet-5"`` for Anthropic).  Empty string uses the adapter
            default, which is the ``OLLAMA_MODEL`` / ``ANTHROPIC_DEFAULT_MODEL`` env var.
    """

    name: str
    description: str = ""
    type: str = "communicator"
    provider: str = "ollama"
    model: str = ""
    system_prompt: str = ""
    icon: str = "🤖"
    active: bool = False
    restricted: str = "user"
    modules: List[str] = []
    config_schema: dict = {}


class BotOut(BaseModel):
    """Response schema representing a single bot with its full configuration and metadata.

    Attributes:
        provider: LLM backend identifier stored on the bot — one of ``"ollama"``,
            ``"anthropic"``, or ``"openai"``.
        config_schema: Declarative UI schema for the bot's configuration page, sourced
            from the module manifest.  Empty dict for bots without a custom config UI.
    """

    id: str
    name: str
    description: str
    type: str
    provider: str
    model: str
    system_prompt: str
    icon: str
    active: bool
    restricted: str
    modules: List[str]
    created_by: str
    config_schema: dict = {}
    created_at: Optional[datetime] = None
