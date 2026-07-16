/** Single event log entry emitted by a module. */
export interface ModuleLogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}

/** Paginated list of module log entries. */
export interface ModuleLogsPage {
  items: ModuleLogEntry[]
  total: number
}

/** Aggregated module activity summary keyed by time bucket and event type. */
export interface ModuleLogSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}

/** Paginated list of module log summary entries. */
export interface ModuleLogSummaryPage {
  items: ModuleLogSummaryEntry[]
  total: number
}

/** Optional filter and pagination parameters for module log events. */
export interface ModuleLogsParams {
  from?: string
  to?: string
  event_type?: string
  limit?: number
  offset?: number
}
