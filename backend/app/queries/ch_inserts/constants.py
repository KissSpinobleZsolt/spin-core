CH_INSERT_API_LOGS = (
    "INSERT INTO api_logs"
    " (level, event_type, owner, path, method, status_code, duration_ms, message) VALUES"
)  # parameterised INSERT for the api_logs table; called by ClickHouseLogAdapter.write_api_log

CH_INSERT_APP_LOGS = (
    "INSERT INTO app_logs (level, event_type, owner, message, name, details) VALUES"
)  # parameterised INSERT for the app_logs table; called by ClickHouseLogAdapter.write_app_log

CH_INSERT_USER_LOGS = (
    "INSERT INTO user_logs (level, event_type, owner, message, name, details) VALUES"
)  # parameterised INSERT for the user_logs table; called by ClickHouseLogAdapter.write_user_log

CH_INSERT_MODULE_LOGS = (
    "INSERT INTO module_logs (scope, owner, event_type, details, level, name, message) VALUES"
)  # parameterised INSERT for the module_logs table; called by ClickHouseLogAdapter.write_module_log

CH_INSERT_BOT_LOGS = (
    "INSERT INTO bot_logs (bot_name, owner, event_type, details, level, name, message) VALUES"
)  # parameterised INSERT for the bot_logs table; called by ClickHouseLogAdapter.write_bot_log

CH_INSERT_NOTIFICATIONS = (
    "INSERT INTO notifications (level, title, message, owner, details) VALUES"
)  # parameterised INSERT for the notifications table; called by ClickHouseLogAdapter.write_notification
