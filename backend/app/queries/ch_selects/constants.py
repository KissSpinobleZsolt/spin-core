# {table}, {where}, {select_cols}, {order_col} are str.format() placeholders.
# %(name)s tokens are clickhouse-driver parameter slots — not touched by format().

CH_TEST_CONNECTION = "SELECT 1"  # minimal connectivity probe; raises on unreachable ClickHouse

CH_BOT_NAMES_WITH_LOGS = "SELECT DISTINCT bot_name FROM bot_logs"  # used at startup to skip re-initialising bots that already have log entries
CH_COMPONENT_NAMES_WITH_LOGS = (
    "SELECT DISTINCT name FROM module_logs"
    " WHERE scope = 'system' AND event_type = 'component.init'"
)  # used at startup to skip re-seeding UI components that already have a component.init log entry
CH_PAGE_ROUTES_WITH_LOGS = (
    "SELECT DISTINCT name FROM module_logs"
    " WHERE scope = 'system' AND event_type = 'page.init'"
)  # used at startup to skip re-seeding page_registry rows that already have a page.init log entry

CH_NOTIFICATIONS_SINCE = """
SELECT toString(id), event_time, level, title, message, owner, details
FROM notifications
WHERE event_time > %(since)s
  AND (owner = %(owner)s OR owner = 'broadcast')
ORDER BY event_time ASC
"""  # returns new notifications for a specific owner plus broadcast messages, oldest-first

CH_PAGINATED_COUNT = "SELECT count() FROM {table} {where}"  # total-row count for the pagination metadata field
CH_PAGINATED_ROWS = (
    "SELECT {select_cols} FROM {table} {where}"
    " ORDER BY {order_col} DESC LIMIT %(limit)s OFFSET %(offset)s"
)  # data page query; most-recent-first ordering is the UI expectation for all log tables

CH_SUMMARY_COUNT = (
    "SELECT count() FROM"
    " (SELECT 1 FROM {table} {where} GROUP BY toStartOfHour(event_time), event_type)"
)  # counts distinct (hour, event_type) buckets for the summary pagination total
CH_SUMMARY_ROWS = """
SELECT toStartOfHour(event_time) AS bucket, event_type,
       count() AS event_count, uniq(owner) AS unique_users
FROM {table} {where}
GROUP BY bucket, event_type
ORDER BY bucket DESC
LIMIT %(limit)s OFFSET %(offset)s
"""  # hourly GROUP BY aggregate used by all module and bot summary endpoints

CH_API_LOGS_SUMMARY = """
SELECT toStartOfHour(event_time) AS bucket, event_type, path, status_code,
       count() AS request_count,
       round(avg(duration_ms), 2) AS avg_duration_ms,
       max(duration_ms) AS max_duration_ms,
       countIf(status_code >= 400) AS error_count
FROM api_logs {where}
GROUP BY bucket, event_type, path, status_code
ORDER BY bucket DESC
LIMIT %(limit)s OFFSET %(offset)s
"""  # richer summary for the API logs UI; includes path, status, latency, and error counts
