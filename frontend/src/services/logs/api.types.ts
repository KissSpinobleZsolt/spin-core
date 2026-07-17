/** Single HTTP/API request log entry from ClickHouse api_logs. */
export interface LogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  path: string
  method: string
  status_code: number
  duration_ms: number
  message: string
}

/** Paginated list of HTTP log entries. */
export interface LogsPage {
  items: LogEntry[]
  total: number
}

/** Aggregated log summary row keyed by time bucket, path, and status code. */
export interface SummaryEntry {
  bucket: string
  event_type: string
  path: string
  status_code: number
  request_count: number
  avg_duration_ms: number
  max_duration_ms: number
  error_count: number
}

/** Paginated list of hourly summary entries. */
export interface SummaryPage {
  items: SummaryEntry[]
  total: number
}

/** Optional filter and pagination parameters for the API/HTTP logs endpoint. */
export interface LogsParams {
  limit?: number
  offset?: number
  event_type?: string
  owner?: string
  from?: string
  to?: string
}

/** Optional filter and pagination parameters for the log summary endpoint. */
export interface SummaryParams {
  from?: string
  to?: string
  event_type?: string
  path?: string
  limit?: number
  offset?: number
}
