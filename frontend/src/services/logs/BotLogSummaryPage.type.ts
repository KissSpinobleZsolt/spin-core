import type { BotLogSummaryEntry } from './BotLogSummaryEntry.type'

/** Paginated list of bot log summary entries. */
export interface BotLogSummaryPage {
  items: BotLogSummaryEntry[]
  total: number
}
