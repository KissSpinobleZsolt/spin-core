from app.settings import AppSettings

_settings: AppSettings = AppSettings()


def get_settings() -> AppSettings:
    return _settings


def set_settings(s: AppSettings) -> None:
    global _settings
    _settings = s
