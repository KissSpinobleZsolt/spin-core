from app.settings import AppSettings
import app.state.constants as _mod  # import the module object so attribute reads always see the current value


def get_settings() -> AppSettings:  # reads the live singleton; never cache the return value
    return _mod._settings


def set_settings(s: AppSettings) -> None:  # replaces the singleton; called once at startup after read_settings()
    _mod._settings = s
