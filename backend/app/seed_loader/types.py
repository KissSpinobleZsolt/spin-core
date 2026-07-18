from dataclasses import dataclass, field
from typing import Literal

from app.seed_loader.constants import _FALLBACK_BOT


@dataclass
class BotSeed:
    """Represents a single bot entry parsed from seed.json."""
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


@dataclass
class SeedData:
    """Aggregated defaults loaded from seed.json used to initialise an empty database."""
    dashboard_content: str = "Hello welcome"
    bot_types: list[dict] = field(default_factory=list)
    bots: list[BotSeed] = field(default_factory=lambda: [BotSeed(**_FALLBACK_BOT)])  # always provides at least one bot
    default_theme: Literal["dark", "light"] = "dark"
    modules: list[dict] = field(default_factory=list)
    ui_components: list[dict] = field(default_factory=list)
