from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class BotRecord:
    """Database-agnostic representation of a bot row returned to callers.

    Attributes:
        id: UUID primary key.
        name: Display name shown in the UI.
        description: Short description of the bot's purpose.
        type: Bot-type slug (e.g. ``"communicator"``).
        provider: LLM backend identifier — one of ``"ollama"``, ``"anthropic"``,
            or ``"openai"``.  Determines which provider adapter the chat route uses.
        model: Provider-specific model identifier (e.g. ``"qwen2.5:7b"`` for Ollama
            or ``"claude-sonnet-5"`` for Anthropic).  Empty string means the
            provider adapter uses its own default.
        system_prompt: Custom instructions injected before each conversation.
        icon: Emoji used to represent this bot in the UI.
        active: Whether the bot is visible to non-admin users.
        restricted: Minimum role required to use this bot (``"user"`` or ``"admin"``).
        modules: IDs of the modules this bot is scoped to.
        created_by: Email of the admin who created this bot.
        created_at: Server-side creation timestamp.
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
    modules: list[str]
    created_by: str
    config_schema: dict = field(default_factory=dict)
    created_at: datetime | None = None
