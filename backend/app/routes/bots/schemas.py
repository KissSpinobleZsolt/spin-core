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

    name: str                     # display name stored in bots.name
    description: str = ""         # short description shown in the bot picker UI
    type: str = "communicator"    # bot-type slug matched against bot_types.name
    provider: str = "ollama"      # LLM backend selector: "ollama", "anthropic", or "openai"
    model: str = ""               # provider-specific model string; empty defers to adapter default
    system_prompt: str = ""       # custom instructions prepended to every conversation
    icon: str = "🤖"              # emoji displayed alongside the bot name
    active: bool = False          # False by default so newly created bots are not immediately visible
    restricted: str = "user"      # minimum role required to use this bot ("user" or "admin")
    modules: List[str] = []       # module IDs this bot is scoped to; empty means platform-wide
    config_schema: dict = {}      # declarative UI schema for the bot config page; empty when unused


class BotOut(BaseModel):
    """Response schema representing a single bot with its full configuration and metadata.

    Attributes:
        provider: LLM backend identifier stored on the bot — one of ``"ollama"``,
            ``"anthropic"``, or ``"openai"``.
        config_schema: Declarative UI schema for the bot's configuration page, sourced
            from the module manifest.  Empty dict for bots without a custom config UI.
    """

    id: str                             # UUID primary key from the bots table
    name: str                           # display name
    description: str                    # short description
    type: str                           # bot-type slug
    provider: str                       # LLM backend identifier
    model: str                          # provider-specific model string
    system_prompt: str                  # custom instructions for this bot
    icon: str                           # emoji identifier
    active: bool                        # visibility flag for non-admin users
    restricted: str                     # minimum role required ("user" or "admin")
    modules: List[str]                  # module IDs this bot is scoped to
    created_by: str                     # email of the admin who created this bot
    config_schema: dict = {}            # declarative config page schema; empty dict when not used
    created_at: Optional[datetime] = None  # server-set creation timestamp; None before first DB read
