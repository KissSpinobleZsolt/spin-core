import { useState, useEffect } from 'react' // local pagination and data state
import {
  logsService, type Bot, type BotLogEntry, type BotLogSummaryEntry, type BotLogsParams,
} from '@services' // log service + types
import TimeRangeFilter, { defaultTimeRange, type TimeRange } from '@components/timeRangeFilter' // time range selector
import { Btn } from '@components/ui/button' // prev/next buttons
import { StatCard } from '@components/ui/statCard' // summary metric cards
import { Spinner } from '@components/ui/spinner' // loading indicator
import { LevelBadge } from './LevelBadge' // log level coloured badge
import { PAGE_SIZE } from './PAGE_SIZE.constant' // rows per page

export function BotLogsDrawer({ bot, onClose }: { bot: Bot; onClose: () => void }) { // slide-in drawer showing bot log history
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange())
  const [summary, setSummary] = useState<BotLogSummaryEntry[]>([])
  const [logs, setLogs] = useState<BotLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const params: BotLogsParams = {
    // monthStart() returns a UTC string without a Z suffix; new Date(str).toISOString() would re-apply the local offset
    from: timeRange.from || undefined,
    to: timeRange.to || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }

  useEffect(() => { // refetch when bot, time range, or page changes
    setLoading(true)
    Promise.all([
      logsService.getBotLogsSummary(bot.id, { from: params.from, to: params.to }),
      logsService.getBotLogs(bot.id, params),
    ])
      .then(([s, l]) => {
        setSummary(s.items)
        setLogs(l.items)
        setTotal(l.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [bot.id, timeRange, page])

  const totalEvents = summary.reduce((a, s) => a + (s.event_count ?? 0), 0) // aggregate from summary MV
  const uniqueUsers = new Set(summary.flatMap(s => Array(s.unique_users ?? 0).fill(''))).size
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">
              {bot.icon && <span className="mr-2">{bot.icon}</span>}{bot.name} — Logs
            </p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{bot.type}</p>
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
          <TimeRangeFilter value={timeRange} onChange={r => { setTimeRange(r); setPage(1) }} />
        </div>

        <div className="px-6 py-3 flex gap-3 border-b border-slate-200 dark:border-slate-700">
          <StatCard label="Total events" value={totalEvents} className="flex-1" />
          <StatCard label="Unique users" value={uniqueUsers} className="flex-1" />
          <StatCard label="Total raw" value={total} className="flex-1" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32"><Spinner /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center mt-8">No log entries found for this period.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-2 pr-3">Time</th>
                  <th className="pb-2 pr-3">Level</th>
                  <th className="pb-2 pr-3">Message</th>
                  <th className="pb-2">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((entry, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-3 text-slate-400 whitespace-nowrap font-mono">
                      {new Date(entry.event_time).toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3">
                      <LevelBadge level={entry.level} />
                    </td>
                    <td className="py-1.5 pr-3">
                      <p className="text-slate-700 dark:text-slate-200">{entry.message || entry.event_type}</p>
                      {entry.name && <p className="text-slate-400 font-mono mt-0.5">{entry.name}</p>}
                      {entry.message && <p className="text-slate-400 font-mono mt-0.5">{entry.event_type}</p>}
                    </td>
                    <td className="py-1.5 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {entry.owner || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
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
