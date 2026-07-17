import type { TimeRange } from './TimeRange.type'

export interface TimeRangeFilterProps {
  value: TimeRange                     // current committed range shown in the inputs
  onChange: (range: TimeRange) => void // called when user applies or picks a preset
}
