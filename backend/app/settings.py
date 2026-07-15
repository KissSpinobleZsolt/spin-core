import json
import os
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Literal

SETTINGS_PATH = Path(os.getenv("SETTINGS_PATH", "/app/data/settings.json"))

DEFAULT_POSTGRES_URL = "postgresql://core-postgres:core-postgres@postgres:5432/core-postgres"
DEFAULT_CLICKHOUSE_URL = "clickhouse://core-ch:core-ch@clickhouse:9000/core"


@dataclass
class ModuleConfig:
    id: str
    name: str
    remote_url: str
    scope: str
    component: str
    route: str
    icon: str
    enabled: bool
    roles: list[str]


@dataclass
class ThemeConfig:
    default_theme: Literal["dark", "light"] = "dark"


@dataclass
class AppSettings:
    theme: ThemeConfig = field(default_factory=ThemeConfig)
    modules: list[ModuleConfig] = field(default_factory=list)


def read_settings() -> AppSettings:
    if not SETTINGS_PATH.exists():
        return AppSettings()
    try:
        raw = json.loads(SETTINGS_PATH.read_text())
        theme = ThemeConfig(**raw.get("theme", {}))
        modules = [ModuleConfig(**m) for m in raw.get("modules", [])]
        return AppSettings(theme=theme, modules=modules)
    except Exception:
        return AppSettings()


def write_settings(s: AppSettings) -> None:
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = SETTINGS_PATH.with_suffix(".tmp")
    data = asdict(s)
    tmp.write_text(json.dumps(data, indent=2))
    tmp.replace(SETTINGS_PATH)


def new_module_id() -> str:
    return str(uuid.uuid4())
