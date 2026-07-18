import type { BotLogEntry } from './BotLogEntry.type'

/** Paginated list of bot log entries. */
export interface BotLogsPage {
  items: BotLogEntry[]
  total: number
}
