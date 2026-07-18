import type { ModuleLogEntry } from './ModuleLogEntry.type'

/** Paginated list of module log entries. */
export interface ModuleLogsPage {
  items: ModuleLogEntry[]
  total: number
}
