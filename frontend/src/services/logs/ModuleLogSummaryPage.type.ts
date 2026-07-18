import type { ModuleLogSummaryEntry } from './ModuleLogSummaryEntry.type'

/** Paginated list of module log summary entries. */
export interface ModuleLogSummaryPage {
  items: ModuleLogSummaryEntry[]
  total: number
}
