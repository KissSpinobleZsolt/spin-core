import { useEffect, useState } from 'react'
import TimeRangeFilter, { defaultTimeRange, type TimeRange } from '@components/timeRangeFilter'
import { Btn } from '@components/ui/button'
import { StatCard } from '@components/ui/statCard'
import { Spinner } from '@components/ui/spinner'
import { Table } from '@components/ui/Table'
import { LevelBadge } from './LevelBadge'
import { PAGE_SIZE } from './PAGE_SIZE.constant'

// Common shape shared by ModuleLogEntry and BotLogEntry
interface LogEntry {
  event_time: string
  level: string
  event_type: string
  owner: string
  message: string
  name: string
  details: string
}

interface LogsDrawerProps {
  name: string
  icon?: string
  subtitle: string  // scope for modules, type for bots
  fetchLogs: (params: { from?: string; to?: string; limit: number; offset: number }) => Promise<{ items: LogEntry[]; total: number }>
  onClose: () => void
}

// Slide-in drawer showing paginated raw log entries; used by ModuleLogsDrawer and BotLogsDrawer
export function LogsDrawer({ name, icon, subtitle, fetchLogs, onClose }: LogsDrawerProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange()) // active time filter
  const [logs, setLogs]           = useState<LogEntry[]>([])                // raw log rows for the current page
  const [total, setTotal]         = useState(0)                             // total matching rows (for pagination)
  const [page, setPage]           = useState(1)                             // current page (1-based)
  const [loading, setLoading]     = useState(false)                         // true while the fetch is in flight

  useEffect(() => {
    const from = timeRange.from ? new Date(timeRange.from).toISOString() : undefined // normalise to ISO-8601
    const to   = timeRange.to   ? new Date(timeRange.to).toISOString()   : undefined
    setLoading(true)
    fetchLogs({ from, to, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }) // convert 1-based page to 0-based offset
      .then(l => { setLogs(l.items); setTotal(l.total) })
      .catch(() => {}) // silently swallow; loading spinner will stop
      .finally(() => setLoading(false))
  }, [name, timeRange, page]) // re-fetch when the target, time range, or page changes

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)) // always at least 1 page

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} /> {/* click backdrop to close */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">
              {icon && <span className="mr-2">{icon}</span>}{name} — Logs
            </p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
          <TimeRangeFilter value={timeRange} onChange={r => { setTimeRange(r); setPage(1) }} /> {/* reset to page 1 on filter change */}
        </div>

        <div className="px-6 py-3 flex gap-3 border-b border-slate-200 dark:border-slate-700">
          <StatCard label="Total events" value={total} className="flex-1" /> {/* total from raw paginated query */}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32"><Spinner /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center mt-8">No log entries found for this period.</p>
          ) : (
            <Table<LogEntry>
              compact // text-xs, px-4 py-2 cells, header background, row hover
              rows={logs}
              rowKey={(_, i) => i}
              columns={[
                {
                  key: 'time',
                  header: 'Time',
                  className: 'text-slate-400 whitespace-nowrap font-mono', // timestamp styling
                  cell: entry => new Date(entry.event_time).toLocaleString(), // format ISO timestamp to locale string
                },
                {
                  key: 'level',
                  header: 'Level',
                  cell: entry => <LevelBadge level={entry.level} />,
                },
                {
                  key: 'message',
                  header: 'Message',
                  cell: entry => (
                    <>
                      <p className="text-slate-700 dark:text-slate-200">{entry.message || entry.event_type}</p>
                      {entry.name    && <p className="text-slate-400 font-mono mt-0.5">{entry.name}</p>}
                      {entry.message && <p className="text-slate-400 font-mono mt-0.5">{entry.event_type}</p>}
                    </>
                  ),
                },
                {
                  key: 'owner',
                  header: 'Owner',
                  className: 'text-slate-500 dark:text-slate-400 truncate max-w-[120px]', // truncate long owner strings
                  cell: entry => entry.owner || '—',
                },
              ]}
            />
          )}
        </div>

        {totalPages > 1 && ( // only render pagination when there are multiple pages
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Btn variant="secondary" className="px-2 py-1 rounded-md text-xs" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Prev</Btn>
              <Btn variant="secondary" className="px-2 py-1 rounded-md text-xs" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next ›</Btn>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
