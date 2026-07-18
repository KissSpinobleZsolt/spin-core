CH_INSERT_API_LOGS = (
    "INSERT INTO api_logs"
    " (level, event_type, owner, path, method, status_code, duration_ms, message) VALUES"
)
CH_INSERT_APP_LOGS = (
    "INSERT INTO app_logs (level, event_type, owner, message, name, details) VALUES"
)
CH_INSERT_USER_LOGS = (
    "INSERT INTO user_logs (level, event_type, owner, message, name, details) VALUES"
)
CH_INSERT_MODULE_LOGS = (
    "INSERT INTO module_logs (scope, owner, event_type, details, level, name, message) VALUES"
)
CH_INSERT_BOT_LOGS = (
    "INSERT INTO bot_logs (bot_name, owner, event_type, details, level, name, message) VALUES"
)
CH_INSERT_NOTIFICATIONS = (
    "INSERT INTO notifications (level, title, message, owner, details) VALUES"
)
