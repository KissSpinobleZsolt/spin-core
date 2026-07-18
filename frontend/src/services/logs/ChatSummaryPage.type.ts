import type { ChatSummaryEntry } from './ChatSummaryEntry.type'

/** Paginated list of chat summary entries. */
export interface ChatSummaryPage {
  items: ChatSummaryEntry[]
  total: number
}
