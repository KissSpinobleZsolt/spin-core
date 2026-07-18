/** Single chat completion log entry stored in ClickHouse. */
export interface ChatLogEntry {
  event_time: string
  owner: string
  event_type: string
  details: string
}
