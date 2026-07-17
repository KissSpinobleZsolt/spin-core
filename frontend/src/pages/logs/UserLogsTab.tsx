import { useState, useEffect } from 'react' // filter and page state
import { type UserLogEntry } from '@services' // user log entry shape
import { Btn } from '../../components/ui/button' // filter + clear buttons
import { Input } from '../../components/ui/input' // owner filter input
import { Spinner } from '../../components/ui/spinner' // loading indicator
import { ErrorBanner } from '../../components/ui/ErrorBanner' // error display
import { Table, type TableColumn } from '../../components/ui/Table' // data table
import { Pagination } from '../../components/ui/Pagination' // page controls
import { formatEventTime } from '@utils' // consistent time formatting
import { useUserLogs } from '@hooks' // paginated user log fetch hook
import { LevelBadge } from './LevelBadge' // log level badge
import { PAGE_SIZE } from './PAGE_SIZE.constant' // rows per page
import { useLogsContext } from './LogsContext.context' // shared time range

export function UserLogsTab() { // paginated, filterable user activity log table
  const { timeRange } = useLogsContext()
  const [page, setPage] = useState(1)
  const [draftOwner, setDraftOwner] = useState('') // unstaged owner filter
  const [ownerFilter, setOwnerFilter] = useState('') // applied owner filter

  // TQ refetches automatically when queryKey (timeRange) changes, but page is local state and won't reset on its own
  useEffect(() => { setPage(1) }, [timeRange])

  const { logs, total, isLoading, isError } = useUserLogs(page, timeRange, ownerFilter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: TableColumn<UserLogEntry>[] = [
    { key: 'time',    header: 'Time',    cell: r => <span className="font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatEventTime(r.event_time)}</span> },
    { key: 'level',   header: 'Level',   cell: r => <LevelBadge level={r.level} /> },
    { key: 'message', header: 'Message', cell: r => (
        <span className="text-slate-700 dark:text-slate-200">
          {r.message || r.event_type}
          {r.name && <span className="ml-2 font-mono text-slate-400 text-[10px]">{r.name}</span>}
        </span>
      ),
    },
    { key: 'owner', header: 'Owner', cell: r => <span className="text-slate-500 dark:text-slate-400">{r.owner || '—'}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-end">
        <Input label="Owner" id="filter-owner-user" value={draftOwner}
          onChange={e => setDraftOwner(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); setOwnerFilter(draftOwner) } }}
          placeholder="user@example.com" className="w-52" />
        <Btn onClick={() => { setPage(1); setOwnerFilter(draftOwner) }}>Filter</Btn>
        <Btn variant="secondary" onClick={() => { setDraftOwner(''); setPage(1); setOwnerFilter('') }}>Clear</Btn>
        <span className="ml-auto text-xs text-slate-400">{total.toLocaleString()} events</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 gap-2"><Spinner size="sm" />Loading…</div>
        ) : isError ? (
          <div className="p-6"><ErrorBanner message="Failed to load user logs." /></div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">No user events found.</div>
        ) : (
          <Table<UserLogEntry> compact columns={columns} rows={logs} rowKey={(_, i) => i} />
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
