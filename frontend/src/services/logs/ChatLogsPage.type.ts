import type { ChatLogEntry } from './ChatLogEntry.type'

/** Paginated list of chat log entries. */
export interface ChatLogsPage {
  items: ChatLogEntry[]
  total: number
}
