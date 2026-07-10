import { useEffect, useState } from 'react'
import { logsService, type LogEntry, type LogsParams } from '../services/logsService'

const PAGE_SIZE = 50

function statusColor(code: number) {
  if (code < 300) return 'text-green-600 dark:text-green-400'
  if (code < 400) return 'text-blue-600 dark:text-blue-400'
  if (code < 500) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState<Pick<LogsParams, 'event_type' | 'user_email'>>({})
  const [draft, setDraft] = useState({ event_type: '', user_email: '' })

  async function fetch(params: LogsParams) {
    setLoading(true)
    setError(null)
    try {
      const data = await logsService.getLogs(params)
      setLogs(data)
    } catch {
      setError('Failed to load logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch({ limit: PAGE_SIZE, offset, ...filters })
  }, [offset, filters])

  function applyFilters() {
    setOffset(0)
    setFilters({
      event_type: draft.event_type || undefined,
      user_email: draft.user_email || undefined,
    })
  }

  function clearFilters() {
    setDraft({ event_type: '', user_email: '' })
    setOffset(0)
    setFilters({})
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Logs</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Event type</label>
          <input
            value={draft.event_type}
            onChange={e => setDraft(d => ({ ...d, event_type: e.target.value }))}
            placeholder="e.g. auth.login"
            className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">User email</label>
          <input
            value={draft.user_email}
            onChange={e => setDraft(d => ({ ...d, user_email: e.target.value }))}
            placeholder="user@example.com"
            className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
          />
        </div>
        <button
          onClick={applyFilters}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Filter
        </button>
        <button
          onClick={clearFilters}
          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
        >
          Clear
        </button>
        <span className="ml-auto text-xs text-slate-400">{PAGE_SIZE} per page</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
            Loading…
          </div>
        ) : error ? (
          <div className="p-6 text-red-500 text-sm">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-slate-400 text-sm text-center">No logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Level</th>
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Method</th>
                  <th className="px-4 py-2 font-medium">Path</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">ms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {String(log.event_time).replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`font-semibold ${log.level === 'ERROR' ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-slate-700 dark:text-slate-300">{log.event_type}</td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[10rem]">{log.user_email || '—'}</td>
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

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
          disabled={offset === 0}
          className="px-3 py-1.5 rounded-lg text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-sm text-slate-500">offset {offset}</span>
        <button
          onClick={() => setOffset(o => o + PAGE_SIZE)}
          disabled={logs.length < PAGE_SIZE}
          className="px-3 py-1.5 rounded-lg text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
