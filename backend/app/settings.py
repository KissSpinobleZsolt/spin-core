import json
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Literal

SETTINGS_PATH = Path(os.getenv("SETTINGS_PATH", "/app/data/settings.json"))

DEFAULT_POSTGRES_URL = "postgresql://core-postgres:core-postgres@postgres:5432/core-postgres"
DEFAULT_CLICKHOUSE_URL = "clickhouse://core-ch:core-ch@clickhouse:9000/core"


@dataclass
class ThemeConfig:
    """Holds the default theme preference for the application UI."""
    default_theme: Literal["dark", "light"] = "dark"


@dataclass
class AppSettings:
    """Top-level application settings container persisted to settings.json."""
    theme: ThemeConfig = field(default_factory=ThemeConfig)


def read_settings() -> AppSettings:
    """Read AppSettings from settings.json, returning defaults on any error or absence."""
    if not SETTINGS_PATH.exists():
        return AppSettings()
    try:
        raw = json.loads(SETTINGS_PATH.read_text())
        theme_raw = raw.get("theme", {})
        theme = ThemeConfig(**{k: v for k, v in theme_raw.items() if k in ("default_theme",)})
        return AppSettings(theme=theme)
    except Exception:
        return AppSettings()


def read_legacy_modules() -> list[dict]:
    """Read modules from settings.json for one-time migration to PostgreSQL."""
    if not SETTINGS_PATH.exists():
        return []
    try:
        raw = json.loads(SETTINGS_PATH.read_text())
        return [m for m in raw.get("modules", []) if isinstance(m, dict)]
    except Exception:
        return []


def write_settings(s: AppSettings) -> None:
    """Atomically write AppSettings to settings.json via a temporary file."""
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = SETTINGS_PATH.with_suffix(".tmp")
    data = asdict(s)
    tmp.write_text(json.dumps(data, indent=2))
    tmp.replace(SETTINGS_PATH)


