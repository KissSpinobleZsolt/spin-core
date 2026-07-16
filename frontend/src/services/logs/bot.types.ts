/** Single event log entry emitted by a bot. */
export interface BotLogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}

/** Paginated list of bot log entries. */
export interface BotLogsPage {
  items: BotLogEntry[]
  total: number
}

/** Aggregated bot activity summary keyed by time bucket and event type. */
export interface BotLogSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}

/** Paginated list of bot log summary entries. */
export interface BotLogSummaryPage {
  items: BotLogSummaryEntry[]
  total: number
}

/** Optional filter and pagination parameters for bot log events. */
export interface BotLogsParams {
  from?: string
  to?: string
  event_type?: string
  limit?: number
  offset?: number
}
