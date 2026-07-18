import type { SummaryEntry } from './SummaryEntry.type'

/** Paginated list of hourly summary entries. */
export interface SummaryPage {
  items: SummaryEntry[]
  total: number
}
