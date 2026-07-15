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
    "type": "chatbot",
    "model": "qwen2.5:7b",
    "system_prompt": "You are a helpful AI assistant.",
    "icon": "💬",
    "enabled": True,
    "roles": ["user", "admin"],
}


@dataclass
class BotSeed:
    name: str
    description: str
    type: str
    model: str
    system_prompt: str
    icon: str
    enabled: bool
    roles: list[str]


@dataclass
class SeedData:
    dashboard_content: str = "Hello welcome"
    bots: list[BotSeed] = field(default_factory=lambda: [BotSeed(**_FALLBACK_BOT)])
    default_theme: Literal["dark", "light"] = "dark"
    modules: list[dict] = field(default_factory=list)


def load_seed() -> SeedData:
    if not SEED_PATH.exists():
        return SeedData()

    try:
        raw = json.loads(SEED_PATH.read_text())
    except Exception as exc:
        print(f"[spin-core] seed.json malformed — using defaults: {exc}", file=sys.stderr)
        return SeedData()

    dashboard_content = raw.get("dashboard", {}).get("content", "Hello welcome")

    bots: list[BotSeed] = []
    for b in raw.get("bots", []):
        try:
            bots.append(BotSeed(
                name=b["name"],
                description=b.get("description", ""),
                type=b.get("type", "chatbot"),
                model=b.get("model", "qwen2.5:7b"),
                system_prompt=b.get("system_prompt", ""),
                icon=b.get("icon", "🤖"),
                enabled=b.get("enabled", True),
                roles=b.get("roles", ["user", "admin"]),
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
        bots=bots,
        default_theme=default_theme,
        modules=modules,
    )
