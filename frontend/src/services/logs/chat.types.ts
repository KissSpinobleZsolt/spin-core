/** Detailed payload of a single chat completion log event. */
export interface ChatLogDetails {
  model: string
  messages: { role: string; content: string }[]
  response: string
  prompt_tokens: number
  eval_tokens: number
  duration_ms: number
}

/** Single chat completion log entry stored in ClickHouse. */
export interface ChatLogEntry {
  event_time: string
  owner: string
  event_type: string
  details: string
}

/** Paginated list of chat log entries. */
export interface ChatLogsPage {
  items: ChatLogEntry[]
  total: number
}

/** Aggregated chat activity summary keyed by time bucket and event type. */
export interface ChatSummaryEntry {
  bucket: string
  event_type: string
  event_count: number
  unique_users: number
}

/** Paginated list of chat summary entries. */
export interface ChatSummaryPage {
  items: ChatSummaryEntry[]
  total: number
}

/** Optional filter and pagination parameters for the chat logs endpoint. */
export interface ChatLogsParams {
  from?: string
  to?: string
  owner?: string
  limit?: number
  offset?: number
}
