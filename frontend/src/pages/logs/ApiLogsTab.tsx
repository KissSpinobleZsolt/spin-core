import { useState, useEffect } from 'react' // filter and page state
import { type LogEntry } from '@services' // API log entry shape
import { Btn } from '../../components/ui/button' // filter + clear buttons
import { Input } from '../../components/ui/input' // filter inputs
import { StatCard } from '../../components/ui/statCard' // metric cards
import { Spinner } from '../../components/ui/spinner' // loading indicator
import { ErrorBanner } from '../../components/ui/ErrorBanner' // error display
import { Table, type TableColumn } from '../../components/ui/Table' // data table
import { Pagination } from '../../components/ui/Pagination' // page controls
import { formatEventTime } from '@utils' // consistent time formatting
import { useApiLogs } from '@hooks' // paginated API log fetch hook
import { LevelBadge } from './LevelBadge' // log level badge
import { statusColor } from './statusColor' // HTTP status colour class
import { PAGE_SIZE } from './PAGE_SIZE.constant' // rows per page
import { useLogsContext } from './LogsContext.context' // shared time range

export function ApiLogsTab() { // paginated, filterable API request log table
  const { timeRange } = useLogsContext()
  const [page, setPage] = useState(1)
  const [draftEvent, setDraftEvent] = useState('') // unstaged event type filter
  const [draftOwner, setDraftOwner] = useState('') // unstaged owner filter
  const [eventTypeFilter, setEventTypeFilter] = useState('') // applied event type filter
  const [ownerFilter, setOwnerFilter] = useState('') // applied owner filter

  // TQ refetches automatically when queryKey (timeRange) changes, but page is local state and won't reset on its own
  useEffect(() => { setPage(1) }, [timeRange])

  const { logs, total, summary, isLoading, isError } = useApiLogs(page, timeRange, eventTypeFilter, ownerFilter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const totalRequests = summary.reduce((s, r) => s + r.request_count, 0) // aggregate across all hourly buckets
  const totalErrors = summary.reduce((s, r) => s + r.error_count, 0)
  const avgDuration = summary.length
    ? (summary.reduce((s, r) => s + r.avg_duration_ms * r.request_count, 0) / Math.max(totalRequests, 1)).toFixed(1)
    : '—'
  const errorRate = totalRequests ? ((totalErrors / totalRequests) * 100).toFixed(1) + '%' : '—'

  function applyFilters() { setPage(1); setEventTypeFilter(draftEvent); setOwnerFilter(draftOwner) } // apply staged filter values
  function clearFilters() { // reset all filter state
    setDraftEvent(''); setDraftOwner(''); setPage(1); setEventTypeFilter(''); setOwnerFilter('')
  }

  const columns: TableColumn<LogEntry>[] = [
    { key: 'time',   header: 'Time',   cell: r => <span className="font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatEventTime(r.event_time)}</span> },
    { key: 'level',  header: 'Level',  cell: r => <LevelBadge level={r.level} /> },
    { key: 'event',  header: 'Event',  cell: r => <span className="font-mono text-slate-700 dark:text-slate-300">{r.event_type}</span> },
    { key: 'owner',  header: 'Owner',  cell: r => <span className="text-slate-500 dark:text-slate-400 block truncate max-w-[10rem]">{r.owner || '—'}</span> },
    { key: 'method', header: 'Method', cell: r => <span className="font-mono text-slate-500 dark:text-slate-400">{r.method}</span> },
    { key: 'path',   header: 'Path',   cell: r => <span className="font-mono text-slate-600 dark:text-slate-300 block truncate max-w-[12rem]">{r.path}</span> },
    { key: 'status', header: 'Status', cell: r => <span className={`font-mono font-semibold ${statusColor(r.status_code)}`}>{r.status_code}</span> },
    { key: 'ms',     header: 'ms',     cell: r => <span className="text-slate-500 dark:text-slate-400">{r.duration_ms.toFixed(1)}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Requests"      value={totalRequests.toLocaleString()}                          className="flex-1 min-w-[110px]" />
        <StatCard label="Errors"        value={totalErrors.toLocaleString()}                            className="flex-1 min-w-[110px]" />
        <StatCard label="Error rate"    value={errorRate}                                               className="flex-1 min-w-[110px]" />
        <StatCard label="Avg duration"  value={avgDuration === '—' ? '—' : `${avgDuration} ms`}        className="flex-1 min-w-[110px]" />
        <StatCard label="Total (filt.)" value={total.toLocaleString()}                                  className="flex-1 min-w-[110px]" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-end">
        <Input label="Event type" id="filter-event" value={draftEvent}
          onChange={e => setDraftEvent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          placeholder="e.g. http.request" className="w-40" />
        <Input label="Owner" id="filter-owner-api" value={draftOwner}
          onChange={e => setDraftOwner(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          placeholder="user@example.com" className="w-44" />
        <Btn onClick={applyFilters}>Filter</Btn>
        <Btn variant="secondary" onClick={clearFilters}>Clear</Btn>
        <span className="ml-auto text-xs text-slate-400">{total.toLocaleString()} rows · {PAGE_SIZE} per page</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 gap-2"><Spinner size="sm" />Loading…</div>
        ) : isError ? (
          <div className="p-6"><ErrorBanner message="Failed to load API logs." /></div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">No API logs found.</div>
        ) : (
          <Table<LogEntry> compact columns={columns} rows={logs} rowKey={(_, i) => i} />
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
