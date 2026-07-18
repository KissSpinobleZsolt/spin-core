CH_DDL_API_LOGS = """
CREATE TABLE IF NOT EXISTS api_logs (
    event_time   DateTime64(3) DEFAULT now64(),
    level        LowCardinality(String) DEFAULT 'INFO',
    event_type   LowCardinality(String),
    owner        String DEFAULT '',
    path         String DEFAULT '',
    method       LowCardinality(String) DEFAULT '',
    status_code  Int16 DEFAULT 0,
    duration_ms  Float32 DEFAULT 0,
    message      String DEFAULT '',
    name         String DEFAULT '',
    details      String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""  # DDL for the HTTP request log table; auto-expires rows after 30 days via TTL

CH_DDL_APP_LOGS = """
CREATE TABLE IF NOT EXISTS app_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT 'system',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""  # DDL for the platform lifecycle log table; auto-expires rows after 30 days

CH_DDL_USER_LOGS = """
CREATE TABLE IF NOT EXISTS user_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT '',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""  # DDL for the user lifecycle log table (login, create, update, delete); 30-day TTL

CH_DDL_MODULE_LOGS = """
CREATE TABLE IF NOT EXISTS module_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    scope       LowCardinality(String),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT '',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY (scope, event_time)
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""  # DDL for the per-module event log table; ordered by (scope, event_time) for efficient scope-scoped queries

CH_DDL_NOTIFICATIONS = """
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID DEFAULT generateUUIDv4(),
    event_time  DateTime64(3) DEFAULT now64(),
    level       LowCardinality(String) DEFAULT 'INFO',
    title       String DEFAULT '',
    message     String DEFAULT '',
    owner       String DEFAULT 'broadcast',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY event_time
TTL toDateTime(event_time) + INTERVAL 7 DAY
"""  # DDL for the notifications table; shorter 7-day TTL since notifications are ephemeral

CH_DDL_BOT_LOGS = """
CREATE TABLE IF NOT EXISTS bot_logs (
    event_time  DateTime64(3) DEFAULT now64(),
    bot_name    LowCardinality(String),
    level       LowCardinality(String) DEFAULT 'INFO',
    event_type  LowCardinality(String),
    owner       String DEFAULT '',
    message     String DEFAULT '',
    name        String DEFAULT '',
    details     String DEFAULT '{}'
) ENGINE = MergeTree()
ORDER BY (bot_name, event_time)
TTL toDateTime(event_time) + INTERVAL 30 DAY
"""  # DDL for the bot event log table; ordered by (bot_name, event_time) for efficient bot-scoped queries
