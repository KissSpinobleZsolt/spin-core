import { useEffect, useState } from 'react'
import { logsService, type ModuleConfig, type ModuleLogEntry, type ModuleLogSummaryEntry, type ModuleLogsParams } from '@services'
import TimeRangeFilter, { defaultTimeRange, type TimeRange } from '@components/timeRangeFilter'
import { Btn } from '@components/ui/button'
import { StatCard } from '@components/ui/statCard'
import { Spinner } from '@components/ui/spinner'
import { Table } from '@components/ui/Table' // shared data table
import { PAGE_SIZE } from './PAGE_SIZE.constant'
import { LevelBadge } from './LevelBadge'

// Slide-in drawer showing paginated log entries and summary stats for a single module
export function ModuleLogsDrawer({ module: mod, onClose }: { module: ModuleConfig; onClose: () => void }) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange())          // active time filter
  const [summary, setSummary]     = useState<ModuleLogSummaryEntry[]>([])            // aggregated hourly summary rows
  const [logs, setLogs]           = useState<ModuleLogEntry[]>([])                   // raw log rows for the current page
  const [total, setTotal]         = useState(0)                                      // total matching rows (for pagination)
  const [page, setPage]           = useState(1)                                      // current page (1-based)
  const [loading, setLoading]     = useState(false)                                  // true while both API calls are in flight

  // Build query params from current filter and pagination state
  const params: ModuleLogsParams = {
    from:   timeRange.from ? new Date(timeRange.from).toISOString() : undefined,
    to:     timeRange.to   ? new Date(timeRange.to).toISOString()   : undefined,
    limit:  PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE, // convert 1-based page to 0-based offset
  }

  // Re-fetch whenever the module, time range, or page changes
  useEffect(() => {
    setLoading(true)
    Promise.all([
      logsService.getModuleLogsSummary(mod.id, { from: params.from, to: params.to }), // summary for stat cards
      logsService.getModuleLogs(mod.id, params),                                       // paged raw logs
    ])
      .then(([s, l]) => {
        setSummary(s.items)
        setLogs(l.items)
        setTotal(l.total)
      })
      .catch(() => {}) // silently swallow errors; loading spinner will stop
      .finally(() => setLoading(false))
  }, [mod.id, timeRange, page])

  const totalEvents = summary.reduce((a, s) => a + (s.event_count ?? 0), 0)                            // sum event counts across all summary buckets
  const uniqueUsers = new Set(summary.flatMap(s => Array(s.unique_users ?? 0).fill(''))).size           // approximate unique user count from summary
  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE))                                         // always at least 1 page

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} /> {/* click backdrop to close */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">
              {mod.icon && <span className="mr-2">{mod.icon}</span>}{mod.name} — Logs
            </p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{mod.scope}</p>
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
          <StatCard label="Total events" value={totalEvents} className="flex-1" />
          <StatCard label="Unique users" value={uniqueUsers} className="flex-1" />
          <StatCard label="Total raw"    value={total}       className="flex-1" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32"><Spinner /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center mt-8">No log entries found for this period.</p>
          ) : (
            <Table<ModuleLogEntry>
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
