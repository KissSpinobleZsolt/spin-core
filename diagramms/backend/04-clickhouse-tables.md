# ClickHouse Tables

6 append-only MergeTree tables with 30-day TTL (notifications: 7 days). No materialized views — summaries are computed via live GROUP BY queries. Defined in `backend/app/db/clickhouse/adapter.py`.

```mermaid
graph LR
    subgraph CH["ClickHouse — all MergeTree, TTL 30 days unless noted"]
        AL["api_logs\nevent_time, path, method,\nstatus_code, duration_ms,\nowner, message, name, details\nORDER BY event_time"]
        APL["app_logs\nevent_time, event_type,\nlevel, name, message,\nowner, details\nORDER BY event_time"]
        UL["user_logs\nevent_time, event_type,\nlevel, name, message,\nowner, details\nORDER BY event_time"]
        ML["module_logs\nscope, event_time, event_type,\nlevel, name, message,\nowner, details\nORDER BY (scope, event_time)"]
        BL["bot_logs\nbot_name, event_time, event_type,\nlevel, name, message,\nowner, details\nORDER BY (bot_name, event_time)"]
        NF["notifications\nevent_time, event_type,\nlevel, owner, name,\nmessage, details\nORDER BY event_time\nTTL 7 days"]
    end

    MW["HTTP Middleware"] -->|"every request"| AL
    Chat["chat router"] -->|"chat.completion"| ML
    Chat -->|"bot.info / bot.error / bot.abort"| BL
    ModLog["module-logs router"] -->|"custom events"| ML
    Auth["auth router"] -->|"user.login"| UL
    Settings["settings router"] -->|"module.init/update/delete"| APL
    BotsR["bots router"] -->|"bot.init/update/delete"| APL
    WS["WebSocket /notifications"] -->|"poll every 5s"| NF
```
