import type { LogEntry } from './LogEntry.type'

/** Paginated list of HTTP log entries. */
export interface LogsPage {
  items: LogEntry[]
  total: number
}
