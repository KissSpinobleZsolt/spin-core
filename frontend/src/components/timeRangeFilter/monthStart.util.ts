import { toInputValue } from './toInputValue.util'

export function monthStart(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), 1) // first day of current month at midnight
  return toInputValue(d.toISOString())
}
