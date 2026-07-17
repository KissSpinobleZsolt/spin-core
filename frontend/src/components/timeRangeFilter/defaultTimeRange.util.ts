import type { TimeRange } from './TimeRange.type'
import { monthStart } from './monthStart.util'
import { nowValue } from './nowValue.util'

export function defaultTimeRange(): TimeRange {
  return { from: monthStart(), to: nowValue() } // default window: first of this month → now
}
