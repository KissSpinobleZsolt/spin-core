import json
import sys
from typing import Literal

from app.seed_loader.constants import SEED_PATH, _FALLBACK_BOT
from app.seed_loader.types import BotSeed, SeedData


def load_seed() -> SeedData:
    """Parse seed.json and return a SeedData instance, falling back to defaults on any error."""
    if not SEED_PATH.exists():  # first run before seed.json has been created; return bare defaults
        return SeedData()

    try:
        raw = json.loads(SEED_PATH.read_text())  # read and parse the file in one call; raises on I/O or JSON errors
    except Exception as exc:
        print(f"[spin-core] seed.json malformed — using defaults: {exc}", file=sys.stderr)  # surface parse errors without crashing startup
        return SeedData()

    dashboard_content = raw.get("dashboard", {}).get("content", "Hello welcome")  # nested get; returns default if the key is absent
    bot_types: list[dict] = raw.get("bot_types", [])  # optional section; empty list disables bot-type seeding

    bots: list[BotSeed] = []  # accumulates successfully-parsed bot entries from the seed file
    for b in raw.get("bots", []):  # iterate over each bot definition declared in the seed file
        try:
            bots.append(BotSeed(
                name=b["name"],  # name is mandatory; KeyError here is intentional to flag invalid entries
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
            print(f"[spin-core] seed.json bot entry invalid, skipping: {exc}", file=sys.stderr)  # skip invalid entries without aborting the whole load
    if not bots:
        bots = [BotSeed(**_FALLBACK_BOT)]  # always provision at least the fallback bot

    settings = raw.get("settings", {})  # optional settings block; defaults to empty dict when absent
    theme_raw = settings.get("theme", {}).get("default_theme", "dark")  # nested get with "dark" as the safe fallback
    default_theme: Literal["dark", "light"] = "light" if theme_raw == "light" else "dark"  # clamp to valid values; any unknown string becomes "dark"
    modules: list[dict] = settings.get("modules", [])  # legacy module list stored under the settings key

    return SeedData(  # all sections collected; return the fully-populated SeedData to the caller
        dashboard_content=dashboard_content,
        bot_types=bot_types,
        bots=bots,
        default_theme=default_theme,
        modules=modules,
    )
