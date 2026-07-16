import { useEffect, useState } from 'react'
import TimeRangeFilter, { defaultTimeRange, type TimeRange } from '../components/TimeRangeFilter'
import {
  logsService,
  type ChatLogDetails,
  type ChatLogEntry,
  type LogEntry,
  type SummaryEntry,
  type UserLogEntry,
} from '../services/logsService'
import { Btn } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { PageTitle } from '../components/ui/PageTitle'
import { formatEventTime } from '../utils/formatters'

const PAGE_SIZE = 50

type Tab = 'api' | 'user' | 'chat'

function statusColor(code: number) {
  if (code < 300) return 'text-green-600 dark:text-green-400'
  if (code < 400) return 'text-blue-600 dark:text-blue-400'
  if (code < 500) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex-1 min-w-[110px]">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-lg font-semibold text-slate-800 dark:text-white">{value}</p>
    </div>
  )
}

function buildPages(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

function Pagination({
  page, totalPages, onPage, jumpInput, setJumpInput, jumpToPage,
}: {
  page: number; totalPages: number
  onPage: (p: number) => void
  jumpInput: string; setJumpInput: (v: string) => void; jumpToPage: () => void
}) {
  const btnCls = 'px-2 py-1 rounded text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors'
  return (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <span className="text-xs text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className={btnCls}>«</button>
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className={`${btnCls} px-2.5`}>‹ Prev</button>
        {buildPages(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-xs text-slate-400">…</span>
          ) : (
            <button key={p} onClick={() => onPage(p as number)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : btnCls}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={`${btnCls} px-2.5`}>Next ›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages} className={btnCls}>»</button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">Jump to</span>
        <input type="number" min={1} max={totalPages} value={jumpInput}
          onChange={e => setJumpInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && jumpToPage()}
          placeholder={String(page)}
          className="w-14 px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={jumpToPage} className={btnCls}>Go</button>
      </div>
    </div>
  )
}

// ── Chat logs tab ────────────────────────────────────────────────────────────

function ChatLogsTab({ timeRange }: { timeRange: TimeRange }) {
  const [entries, setEntries] = useState<ChatLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [jumpInput, setJumpInput] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [draftEmail, setDraftEmail] = useState('')
  const [emailFilter, setEmailFilter] = useState('')
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
    setExpanded(null)
  }, [timeRange])

  useEffect(() => {
    load(page, timeRange, emailFilter)
  }, [page, timeRange, emailFilter])

  async function load(p: number, tr: TimeRange, email: string) {
    setLoading(true)
    setError(null)
    try {
      const result = await logsService.getChatLogs({
        limit: PAGE_SIZE,
        offset: (p - 1) * PAGE_SIZE,
        from: tr.from,
        to: tr.to,
        owner: email || undefined,
      })
      setEntries(result.items)
      setTotal(result.total)
    } catch {
      setError('Failed to load chat logs.')
    } finally {
      setLoading(false)
    }
  }

  function jumpToPage() {
    const n = parseInt(jumpInput, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n)
    setJumpInput('')
  }

  function parseDetails(raw: string): ChatLogDetails | null {
    try { return JSON.parse(raw) } catch { return null }
  }

  const inputCls = 'px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">User email</label>
          <input value={draftEmail} onChange={e => setDraftEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); setEmailFilter(draftEmail) } }}
            placeholder="user@example.com" className={`${inputCls} w-52`} />
        </div>
        <Btn onClick={() => { setPage(1); setEmailFilter(draftEmail) }}>Filter</Btn>
        <Btn variant="secondary" onClick={() => { setDraftEmail(''); setPage(1); setEmailFilter('') }}>Clear</Btn>
        <span className="ml-auto text-xs text-slate-400">{total.toLocaleString()} conversations</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 gap-2">
            <Spinner size="sm" />Loading…
          </div>
        ) : error ? (
          <div className="p-6 text-red-500 text-sm">{error}</div>
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

      <Pagination page={page} totalPages={totalPages} onPage={p => { setPage(p); setExpanded(null) }}
        jumpInput={jumpInput} setJumpInput={setJumpInput} jumpToPage={jumpToPage} />
    </div>
  )
}

// ── Level badge (shared) ──────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  WARN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

function LevelBadge({ level }: { level: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${LEVEL_STYLES[level] ?? LEVEL_STYLES.INFO}`}>
      {level}
    </span>
  )
}

// ── API logs tab ──────────────────────────────────────────────────────────────

function ApiLogsTab({ timeRange }: { timeRange: TimeRange }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<SummaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [jumpInput, setJumpInput] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [draftEvent, setDraftEvent] = useState('')
  const [draftOwner, setDraftOwner] = useState('')
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { setPage(1) }, [timeRange])

  useEffect(() => {
    load(page, timeRange, eventTypeFilter, ownerFilter)
  }, [page, timeRange, eventTypeFilter, ownerFilter])

  async function load(p: number, tr: TimeRange, et: string, ow: string) {
    setLoading(true); setError(null)
    try {
      const [logsResult, summaryResult] = await Promise.all([
        logsService.getLogs({ limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE, event_type: et || undefined, owner: ow || undefined, from: tr.from, to: tr.to }),
        logsService.getSummary({ from: tr.from, to: tr.to, event_type: et || undefined, limit: 1000 }),
      ])
      setLogs(logsResult.items); setTotal(logsResult.total); setSummary(summaryResult.items)
    } catch { setError('Failed to load API logs.') }
    finally { setLoading(false) }
  }

  function applyFilters() { setPage(1); setEventTypeFilter(draftEvent); setOwnerFilter(draftOwner) }
  function clearFilters() { setDraftEvent(''); setDraftOwner(''); setPage(1); setEventTypeFilter(''); setOwnerFilter('') }
  function jumpToPage() { const n = parseInt(jumpInput, 10); if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n); setJumpInput('') }

  const totalRequests = summary.reduce((s, r) => s + r.request_count, 0)
  const totalErrors = summary.reduce((s, r) => s + r.error_count, 0)
  const avgDuration = summary.length ? (summary.reduce((s, r) => s + r.avg_duration_ms * r.request_count, 0) / Math.max(totalRequests, 1)).toFixed(1) : '—'
  const errorRate = totalRequests ? ((totalErrors / totalRequests) * 100).toFixed(1) + '%' : '—'

  const inputCls = 'px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Requests" value={totalRequests.toLocaleString()} />
        <StatCard label="Errors" value={totalErrors.toLocaleString()} />
        <StatCard label="Error rate" value={errorRate} />
        <StatCard label="Avg duration" value={avgDuration === '—' ? '—' : `${avgDuration} ms`} />
        <StatCard label="Total (filtered)" value={total.toLocaleString()} />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Event type</label>
          <input value={draftEvent} onChange={e => setDraftEvent(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFilters()} placeholder="e.g. http.request" className={`${inputCls} w-40`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Owner</label>
          <input value={draftOwner} onChange={e => setDraftOwner(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFilters()} placeholder="user@example.com" className={`${inputCls} w-44`} />
        </div>
        <Btn onClick={applyFilters}>Filter</Btn>
        <Btn variant="secondary" onClick={clearFilters}>Clear</Btn>
        <span className="ml-auto text-xs text-slate-400">{total.toLocaleString()} rows · {PAGE_SIZE} per page</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 gap-2"><Spinner size="sm" />Loading…</div>
        ) : error ? (
          <div className="p-6 text-red-500 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">No API logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Level</th>
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Owner</th>
                  <th className="px-4 py-2 font-medium">Method</th>
                  <th className="px-4 py-2 font-medium">Path</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">ms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatEventTime(log.event_time)}</td>
                    <td className="px-4 py-2"><LevelBadge level={log.level} /></td>
                    <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{log.event_type}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[10rem]">{log.owner || '—'}</td>
                    <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400">{log.method}</td>
                    <td className="px-4 py-2 font-mono text-slate-600 dark:text-slate-300 truncate max-w-[12rem]">{log.path}</td>
                    <td className={`px-4 py-2 font-mono font-semibold ${statusColor(log.status_code)}`}>{log.status_code}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{log.duration_ms.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage}
        jumpInput={jumpInput} setJumpInput={setJumpInput} jumpToPage={jumpToPage} />
    </div>
  )
}

// ── User logs tab ─────────────────────────────────────────────────────────────

function UserLogsTab({ timeRange }: { timeRange: TimeRange }) {
  const [logs, setLogs] = useState<UserLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [jumpInput, setJumpInput] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [draftOwner, setDraftOwner] = useState('')
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { setPage(1) }, [timeRange])
  useEffect(() => { load(page, timeRange, ownerFilter) }, [page, timeRange, ownerFilter])

  async function load(p: number, tr: TimeRange, ow: string) {
    setLoading(true); setError(null)
    try {
      const result = await logsService.getUserLogs({ limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE, owner: ow || undefined, from: tr.from, to: tr.to })
      setLogs(result.items); setTotal(result.total)
    } catch { setError('Failed to load user logs.') }
    finally { setLoading(false) }
  }

  function jumpToPage() { const n = parseInt(jumpInput, 10); if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n); setJumpInput('') }

  const inputCls = 'px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Owner</label>
          <input value={draftOwner} onChange={e => setDraftOwner(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); setOwnerFilter(draftOwner) } }}
            placeholder="user@example.com" className={`${inputCls} w-52`} />
        </div>
        <Btn onClick={() => { setPage(1); setOwnerFilter(draftOwner) }}>Filter</Btn>
        <Btn variant="secondary" onClick={() => { setDraftOwner(''); setPage(1); setOwnerFilter('') }}>Clear</Btn>
        <span className="ml-auto text-xs text-slate-400">{total.toLocaleString()} events</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 gap-2"><Spinner size="sm" />Loading…</div>
        ) : error ? (
          <div className="p-6 text-red-500 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">No user events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Level</th>
                  <th className="px-4 py-2 font-medium">Message</th>
                  <th className="px-4 py-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatEventTime(log.event_time)}</td>
                    <td className="px-4 py-2"><LevelBadge level={log.level} /></td>
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                      <span>{log.message || log.event_type}</span>
                      {log.name && <span className="ml-2 font-mono text-slate-400 text-[10px]">{log.name}</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{log.owner || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage}
        jumpInput={jumpInput} setJumpInput={setJumpInput} jumpToPage={jumpToPage} />
    </div>
  )
}

// ── Page root ────────────────────────────────────────────────────────────────

export default function Logs() {
  const [tab, setTab] = useState<Tab>('api')
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange())
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

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-blue-600 text-white'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
    }`


  return (
    <div className="space-y-4">
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

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <TimeRangeFilter value={timeRange} onChange={range => setTimeRange(range)} />
      </div>

      <div className="flex gap-2">
        <button className={tabCls('api')} onClick={() => setTab('api')}>API Logs</button>
        <button className={tabCls('user')} onClick={() => setTab('user')}>User Logs</button>
        <button className={tabCls('chat')} onClick={() => setTab('chat')}>Chat Logs</button>
      </div>

      {tab === 'api' && <ApiLogsTab timeRange={timeRange} />}
      {tab === 'user' && <UserLogsTab timeRange={timeRange} />}
      {tab === 'chat' && <ChatLogsTab timeRange={timeRange} />}
    </div>
  )
}
