import { useState, useEffect } from 'react' // filter, page, and expand state
import { type ChatLogDetails } from '@services' // chat log detail shape
import { Btn } from '@components/ui/button' // filter + clear buttons
import { Input } from '@components/ui/input' // email filter input
import { Spinner } from '@components/ui/spinner' // loading indicator
import { ErrorBanner } from '@components/ui/ErrorBanner' // error display
import { Pagination } from '@components/ui/Pagination' // page controls
import { formatEventTime } from '@utils' // consistent time formatting
import { useChatLogs } from '@hooks' // paginated chat log fetch hook
import { PAGE_SIZE } from './PAGE_SIZE.constant' // rows per page
import { useLogsContext } from './LogsContext.context' // shared time range

export function ChatLogsTab() { // paginated chat log viewer with expandable conversation replay
  const { timeRange } = useLogsContext()
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null) // index of expanded row, or null
  const [draftEmail, setDraftEmail] = useState('') // unstaged email filter
  const [emailFilter, setEmailFilter] = useState('') // applied email filter

  // TQ refetches automatically when queryKey (timeRange) changes, but page is local state and won't reset on its own
  useEffect(() => { setPage(1); setExpanded(null) }, [timeRange])

  const { entries, total, isLoading, isError } = useChatLogs(page, timeRange, emailFilter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function parseDetails(raw: string): ChatLogDetails | null { // silently ignore malformed JSON
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
              const d = parseDetails(entry.details) // parsed detail payload
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
