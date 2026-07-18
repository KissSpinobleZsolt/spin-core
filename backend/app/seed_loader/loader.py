import json
import sys
from typing import Literal

from app.seed_loader.constants import SEED_PATH, _FALLBACK_BOT
from app.seed_loader.types import BotSeed, SeedData


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
                provider=b.get("provider", "ollama"),
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
        bots = [BotSeed(**_FALLBACK_BOT)]  # always provision at least the fallback bot

    settings = raw.get("settings", {})
    theme_raw = settings.get("theme", {}).get("default_theme", "dark")
    default_theme: Literal["dark", "light"] = "light" if theme_raw == "light" else "dark"
    modules: list[dict] = settings.get("modules", [])

    ui_components: list[dict] = raw.get("ui_components", [])

    return SeedData(
        dashboard_content=dashboard_content,
        bot_types=bot_types,
        bots=bots,
        default_theme=default_theme,
        modules=modules,
        ui_components=ui_components,
    )
