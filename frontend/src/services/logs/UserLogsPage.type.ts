import type { UserLogEntry } from './UserLogEntry.type'

/** Paginated list of user log entries. */
export interface UserLogsPage {
  items: UserLogEntry[]
  total: number
}
