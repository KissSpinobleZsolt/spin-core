import type { LogEntry, SummaryEntry } from '@services'

/** Shape of the combined logs + summary response used by useApiLogs. */
export interface ApiLogsResult {
  logs: LogEntry[]
  total: number
  summary: SummaryEntry[]
}
