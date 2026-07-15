from pydantic import BaseModel


class ModuleInput(BaseModel):
    name: str
    description: str = ""
    remote_url: str
    scope: str
    component: str
    route: str
    icon: str = "🧩"
    enabled: bool = True
    roles: list[str] = ["user", "admin"]
    presets: dict = {"i18n": {}, "layout": {}, "settings": {}}
    backend_url: str | None = None
