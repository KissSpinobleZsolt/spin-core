from dataclasses import dataclass, field
from typing import Literal

from app.seed_loader.constants import _FALLBACK_BOT


@dataclass
class BotSeed:
    """Represents a single bot entry parsed from seed.json."""
    name: str           # display name stored in bots.name; used as the identity key when deduplicating
    description: str    # short description shown in the bot picker UI
    type: str           # bot-type slug (e.g. "communicator"); matched against bot_types.name at runtime
    provider: str       # LLM backend selector: "ollama", "anthropic", or "openai"
    model: str          # provider-specific model identifier; empty string defers to the adapter default
    system_prompt: str  # custom instructions prepended to every conversation with this bot
    icon: str           # emoji displayed alongside the bot name in UI lists
    active: bool        # whether the bot is immediately visible to non-admin users after seeding
    restricted: str     # minimum role required to use this bot ("user" or "admin")
    modules: list[str]  # list of module IDs this bot is scoped to; empty means platform-wide


@dataclass
class SeedData:
    """Aggregated defaults loaded from seed.json used to initialise an empty database."""
    dashboard_content: str = "Hello welcome"  # initial Markdown/HTML written to the dashboard page row
    bot_types: list[dict] = field(default_factory=list)  # bot-type definitions seeded into the bot_types table
    bots: list[BotSeed] = field(default_factory=lambda: [BotSeed(**_FALLBACK_BOT)])  # always provides at least one bot
    default_theme: Literal["dark", "light"] = "dark"  # initial platform theme persisted to settings.json
    modules: list[dict] = field(default_factory=list)  # legacy module entries from seed.json settings.modules
