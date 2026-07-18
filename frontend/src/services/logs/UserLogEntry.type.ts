/** Single user lifecycle log entry from ClickHouse user_logs. */
export interface UserLogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}
