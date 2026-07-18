from app.settings import AppSettings

_settings: AppSettings = AppSettings()  # process-wide singleton; mutated by set_settings on startup
