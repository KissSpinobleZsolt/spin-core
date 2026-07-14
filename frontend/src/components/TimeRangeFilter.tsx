import { useEffect, useState } from 'react'

export interface TimeRange {
  from: string
  to: string
}

interface Props {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

function toInputValue(iso: string) {
  return iso.slice(0, 16)
}

function monthStart(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  return toInputValue(d.toISOString())
}

function nowValue(): string {
  return toInputValue(new Date().toISOString())
}

export function defaultTimeRange(): TimeRange {
  return { from: monthStart(), to: nowValue() }
}

export default function TimeRangeFilter({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  function apply() {
    if (draft.from && draft.to) onChange(draft)
  }

  function setThisMonth() {
    const range = { from: monthStart(), to: nowValue() }
    setDraft(range)
    onChange(range)
  }

  function setToday() {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const range = { from: toInputValue(start.toISOString()), to: nowValue() }
    setDraft(range)
    onChange(range)
  }

  function setLast7() {
    const now = new Date()
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const range = { from: toInputValue(start.toISOString()), to: nowValue() }
    setDraft(range)
    onChange(range)
  }

  const inputCls =
    'px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 ' +
    'dark:border-slate-600 text-sm text-slate-800 dark:text-white focus:outline-none ' +
    'focus:ring-1 focus:ring-blue-500 [color-scheme:light] dark:[color-scheme:dark]'

  const presetCls =
    'px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 ' +
    'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors'

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From</label>
        <input
          type="datetime-local"
          value={draft.from}
          onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">To</label>
        <input
          type="datetime-local"
          value={draft.to}
          onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
          className={inputCls}
        />
      </div>
      <button onClick={apply} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
        Apply
      </button>
      <div className="flex items-center gap-1 ml-1">
        <button onClick={setToday} className={presetCls}>Today</button>
        <button onClick={setLast7} className={presetCls}>7 days</button>
        <button onClick={setThisMonth} className={presetCls}>This month</button>
      </div>
    </div>
  )
}
