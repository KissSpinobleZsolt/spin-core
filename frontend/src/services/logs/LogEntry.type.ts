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
