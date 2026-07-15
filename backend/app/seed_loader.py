import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

SEED_PATH = Path(os.getenv("SEED_PATH", "./data/seed.json"))

_FALLBACK_BOT = {
    "name": "AI Assistant",
    "description": "General-purpose AI assistant powered by Ollama.",
    "type": "communicator",
    "model": "qwen2.5:7b",
    "system_prompt": "You are a helpful AI assistant for this platform. Use the platform context above to help users understand what they can do, which pages to visit, and which bots or modules are available. Be concise and friendly.",
    "icon": "💬",
    "active": True,
    "restricted": "user",
    "modules": ["core"],
}


@dataclass
class BotSeed:
    """Represents a single bot entry parsed from seed.json."""
    name: str
    description: str
    type: str
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
    bots: list[BotSeed] = field(default_factory=lambda: [BotSeed(**_FALLBACK_BOT)])
    default_theme: Literal["dark", "light"] = "dark"
    modules: list[dict] = field(default_factory=list)


def load_seed() -> SeedData:
    """Parse seed.json and return a SeedData instance, falling back to defaults on any error."""
    if not SEED_PATH.exists():
        return SeedData()

    try:
        raw = json.loads(SEED_PATH.read_text())
    except Exception as exc:
        print(f"[spin-core] seed.json malformed — using defaults: {exc}", file=sys.stderr)
        return SeedData()

    dashboard_content = raw.get("dashboard", {}).get("content", "Hello welcome")
    bot_types: list[dict] = raw.get("bot_types", [])

    bots: list[BotSeed] = []
    for b in raw.get("bots", []):
        try:
            bots.append(BotSeed(
                name=b["name"],
                description=b.get("description", ""),
                type=b.get("type", "communicator"),
                model=b.get("model", "qwen2.5:7b"),
                system_prompt=b.get("system_prompt", ""),
                icon=b.get("icon", "🤖"),
                active=b.get("active", False),
                restricted=b.get("restricted", "user"),
                modules=b.get("modules", []),
            ))
        except Exception as exc:
            print(f"[spin-core] seed.json bot entry invalid, skipping: {exc}", file=sys.stderr)
    if not bots:
        bots = [BotSeed(**_FALLBACK_BOT)]

    settings = raw.get("settings", {})
    theme_raw = settings.get("theme", {}).get("default_theme", "dark")
    default_theme: Literal["dark", "light"] = "light" if theme_raw == "light" else "dark"
    modules: list[dict] = settings.get("modules", [])

    return SeedData(
        dashboard_content=dashboard_content,
        bot_types=bot_types,
        bots=bots,
        default_theme=default_theme,
        modules=modules,
    )
