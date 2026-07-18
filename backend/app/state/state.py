from app.settings import AppSettings
import app.state.constants as _mod  # import the module object so attribute reads always see the current value


def get_settings() -> AppSettings:  # reads the live singleton; never cache the return value
    return _mod._settings  # indirect read through the module object ensures we always see the latest assignment


def set_settings(s: AppSettings) -> None:  # replaces the singleton; called once at startup after read_settings()
    _mod._settings = s  # write through the module reference so subsequent get_settings() calls see the update
