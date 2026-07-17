import { useState, useEffect, createContext, useContext, type ReactNode, createElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import TimeRangeFilter, { defaultTimeRange, type TimeRange } from '@components/timeRangeFilter'
import {
  logsService,
  type ChatLogDetails,
  type LogEntry,
  type UserLogEntry,
} from '@services'
import { Btn } from '../components/ui/Button'
import { Spinner } from '../components/ui/spinner'
import { PageTitle } from '../components/ui/PageTitle'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { StatCard } from '../components/ui/statCard'
import { Tabs } from '../components/ui/tabs'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Table, type TableColumn } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { formatEventTime } from '@utils'
import { useApiLogs, useUserLogs, useChatLogs } from '@hooks'

const PAGE_SIZE = 50
type Tab = 'api' | 'user' | 'chat'

// ─── Shared utilities ─────────────────────────────────────────────────────────

function statusColor(code: number) {
  if (code < 300) return 'text-green-600 dark:text-green-400'
  if (code < 400) return 'text-blue-600 dark:text-blue-400'
  if (code < 500) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

const LEVEL_VARIANT: Record<string, 'info' | 'warn' | 'error'> = {
  INFO: 'info', WARN: 'warn', ERROR: 'error',
}

function LevelBadge({ level }: { level: string }) {
  return <Badge variant={LEVEL_VARIANT[level] ?? 'info'}>{level || 'INFO'}</Badge>
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface LogsContextValue {
  tab: Tab
  setTab: (t: Tab) => void
  timeRange: TimeRange
  setTimeRange: (r: TimeRange) => void
  purging: boolean
  purgeResult: { purged: string[]; errors: string[] } | null
  handlePurge: () => void
}

const LogsContext = createContext<LogsContextValue | null>(null)

function useLogsContext() {
  const ctx = useContext(LogsContext)
  if (!ctx) throw new Error('useLogsContext must be used inside <LogsProvider>')
  return ctx
}

function LogsProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab | null) ?? 'api'

  function setTab(t: Tab) {
    // replace:true — tab switches should not add history entries; back button would otherwise step through each tab
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab', t); return n }, { replace: true })
  }

  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<{ purged: string[]; errors: string[] } | null>(null)

  async function handlePurge() {
    setPurging(true)
    setPurgeResult(null)
    try {
      const result = await logsService.purgeExpiredLogs()
      setPurgeResult(result)
    } finally {
      setPurging(false)
    }
  }

  return createElement(
    LogsContext.Provider,
    { value: { tab, setTab, timeRange, setTimeRange, purging, purgeResult, handlePurge } },
    children,
  )
}

// ─── API logs tab ─────────────────────────────────────────────────────────────

function ApiLogsTab() {
  const { timeRange } = useLogsContext()
  const [page, setPage] = useState(1)
  const [draftEvent, setDraftEvent] = useState('')
  const [draftOwner, setDraftOwner] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')

  // TQ refetches automatically when queryKey (timeRange) changes, but page is local state and won't reset on its own
  useEffect(() => { setPage(1) }, [timeRange])

  const { logs, total, summary, isLoading, isError } = useApiLogs(page, timeRange, eventTypeFilter, ownerFilter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const totalRequests = summary.reduce((s, r) => s + r.request_count, 0)
  const totalErrors = summary.reduce((s, r) => s + r.error_count, 0)
  const avgDuration = summary.length
    ? (summary.reduce((s, r) => s + r.avg_duration_ms * r.request_count, 0) / Math.max(totalRequests, 1)).toFixed(1)
    : '—'
  const errorRate = totalRequests ? ((totalErrors / totalRequests) * 100).toFixed(1) + '%' : '—'

  function applyFilters() { setPage(1); setEventTypeFilter(draftEvent); setOwnerFilter(draftOwner) }
  function clearFilters() {
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

// ─── User logs tab ────────────────────────────────────────────────────────────

function UserLogsTab() {
  const { timeRange } = useLogsContext()
  const [page, setPage] = useState(1)
  const [draftOwner, setDraftOwner] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')

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

// ─── Chat logs tab ────────────────────────────────────────────────────────────

function ChatLogsTab() {
  const { timeRange } = useLogsContext()
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [draftEmail, setDraftEmail] = useState('')
  const [emailFilter, setEmailFilter] = useState('')

  // TQ refetches automatically when queryKey (timeRange) changes, but page is local state and won't reset on its own
  useEffect(() => { setPage(1); setExpanded(null) }, [timeRange])

  const { entries, total, isLoading, isError } = useChatLogs(page, timeRange, emailFilter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function parseDetails(raw: string): ChatLogDetails | null {
    try { return JSON.parse(raw) } catch { return null }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-end">
        <Input label="User email" id="filter-owner-chat" value={draftEmail}
          onChange={e => setDraftEmail(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setPage(1); setEmailFilter(draftEmail) } }}
          placeholder="user@example.com" className="w-52" />
        <Btn onClick={() => { setPage(1); setEmailFilter(draftEmail) }}>Filter</Btn>
        <Btn variant="secondary" onClick={() => { setDraftEmail(''); setPage(1); setEmailFilter('') }}>Clear</Btn>
        <span className="ml-auto text-xs text-slate-400">{total.toLocaleString()} conversations</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 gap-2"><Spinner size="sm" />Loading…</div>
        ) : isError ? (
          <div className="p-6"><ErrorBanner message="Failed to load chat logs." /></div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">No chat logs found for this period.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {entries.map((entry, i) => {
              const d = parseDetails(entry.details)
              const isOpen = expanded === i
              return (
                <div key={i}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatEventTime(entry.event_time)}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-[12rem]">
                        {entry.owner || '—'}
                      </span>
                      {d && (
                        <>
                          <span className="font-mono text-slate-500 dark:text-slate-400">{d.model}</span>
                          <span className="text-slate-400">{d.prompt_tokens + d.eval_tokens} tokens</span>
                          <span className="text-slate-400">{d.duration_ms.toFixed(0)} ms</span>
                          <span className="ml-auto text-slate-400 truncate max-w-[20rem] italic">
                            {d.messages.filter(m => m.role === 'user').at(-1)?.content.slice(0, 80) ?? ''}
                          </span>
                        </>
                      )}
                      <span className={`ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                  </button>
                  {isOpen && d && (
                    <div className="px-4 pb-4 space-y-2 bg-slate-50 dark:bg-slate-900/40">
                      {d.messages.map((msg, j) => (
                        <div key={j} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap break-words ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {d.response && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap break-words bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                            {d.response}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={p => { setPage(p); setExpanded(null) }} />
    </div>
  )
}

// ─── Page sub-components (subscribe to LogsProvider) ─────────────────────────

function LogsHeader() {
  const { purging, purgeResult, handlePurge } = useLogsContext()
  return (
    <div className="flex items-center justify-between">
      <PageTitle>Logs</PageTitle>
      <div className="flex items-center gap-3">
        {purgeResult && (
          <span className={`text-xs ${purgeResult.errors.length ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
            {purgeResult.errors.length
              ? `${purgeResult.purged.length} purged, ${purgeResult.errors.length} error(s)`
              : `${purgeResult.purged.length} table(s) purged`}
          </span>
        )}
        <Btn variant="secondary" disabled={purging} onClick={handlePurge}>
          {purging ? 'Purging…' : 'Purge expired logs'}
        </Btn>
      </div>
    </div>
  )
}

function LogsTimeFilter() {
  const { timeRange, setTimeRange } = useLogsContext()
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
    </div>
  )
}

function LogsContent() {
  const { tab, setTab } = useLogsContext()
  return (
    <>
      <Tabs
        tabs={[
          { key: 'api',  label: 'API Logs' },
          { key: 'user', label: 'User Logs' },
          { key: 'chat', label: 'Chat Logs' },
        ]}
        active={tab}
        onChange={t => setTab(t as Tab)}
      />
      {tab === 'api'  && <ApiLogsTab />}
      {tab === 'user' && <UserLogsTab />}
      {tab === 'chat' && <ChatLogsTab />}
    </>
  )
}

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function Logs() {
  return (
    <LogsProvider>
      <div className="space-y-4">
        <LogsHeader />
        <LogsTimeFilter />
        <LogsContent />
      </div>
    </LogsProvider>
  )
}
