import { useEffect, useState } from 'react'
import { Btn } from '@components/ui/button'
import { toInputValue } from './toInputValue.util'
import { monthStart } from './monthStart.util'
import { nowValue } from './nowValue.util'
import type { TimeRangeFilterProps } from './TimeRangeFilterProps.type'
import { TIME_RANGE_FILTER_TEXT as TEXT } from './TimeRangeFilter.constant'
import './TimeRangeFilter.style.css'

export default function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const [draft, setDraft] = useState(value) // local draft before the user hits Apply

  useEffect(() => { setDraft(value) }, [value]) // sync when parent resets the range

  function apply() {
    if (draft.from && draft.to) onChange(draft) // only fire when both ends are set
  }

  function setThisMonth() {
    const range = { from: monthStart(), to: nowValue() } // first of month → now
    setDraft(range)
    onChange(range)
  }

  function setToday() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // midnight today
    const range = { from: toInputValue(start.toISOString()), to: nowValue() }
    setDraft(range)
    onChange(range)
  }

  function setLast7() {
    const now = new Date()
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    const range = { from: toInputValue(start.toISOString()), to: nowValue() }
    setDraft(range)
    onChange(range)
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="time-range-filter__label">{TEXT.FROM_LABEL}</label>
        <input
          type="datetime-local"
          value={draft.from}
          onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
          className="time-range-filter__input"
        />
      </div>
      <div>
        <label className="time-range-filter__label">{TEXT.TO_LABEL}</label>
        <input
          type="datetime-local"
          value={draft.to}
          onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
          className="time-range-filter__input"
        />
      </div>
      <Btn onClick={apply}>{TEXT.APPLY}</Btn>
      <div className="flex items-center gap-1 ml-1">
        <Btn variant="secondary" className="time-range-filter__preset-btn" onClick={setToday}>{TEXT.TODAY}</Btn>
        <Btn variant="secondary" className="time-range-filter__preset-btn" onClick={setLast7}>{TEXT.LAST_7}</Btn>
        <Btn variant="secondary" className="time-range-filter__preset-btn" onClick={setThisMonth}>{TEXT.THIS_MONTH}</Btn>
      </div>
    </div>
  )
}
