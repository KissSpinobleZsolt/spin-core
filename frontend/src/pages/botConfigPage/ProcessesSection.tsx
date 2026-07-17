import { useState, useEffect, useCallback } from 'react' // async load + polling control
import { botConfigService, type BotProcesses } from '@services' // processes data type + fetch
import { Spinner } from '../../components/ui/spinner' // loading indicator
import { ErrorBanner } from '../../components/ui/ErrorBanner' // error display
import { StatRow } from './StatRow' // key-value stat row
import { SEVERITY_COLOUR_MAP } from './SEVERITY_COLOUR_MAP.constant' // severity classes

export function ProcessesSection({ scope, botId }: { scope: string; botId: string }) { // shows bot process metrics and scheduler jobs
  const [data, setData] = useState<BotProcesses | null>(null) // process status payload
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => { // fetches process status on mount and on refresh button
    setLoading(true)
    setError('')
    try {
      setData(await botConfigService.getProcesses(scope, botId))
    } catch {
      setError('Could not load process status.')
    } finally {
      setLoading(false)
    }
  }, [scope, botId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>
  if (error) return <ErrorBanner message={error} />
  if (!data) return null

  return (
    <div className="space-y-1.5">
      <StatRow label="Signals today" value={String(data.signals_today)} />
      <StatRow label="Pending alerts" value={String(data.pending_alerts)} />
      <StatRow label="Active symbols" value={String(data.active_entities)} />
      {data.last_signal && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">Last signal</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLOUR_MAP[data.last_signal.severity] ?? ''}`}>
            {data.last_signal.severity}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{data.last_signal.title}</span>
        </div>
      )}
      {Object.entries(data.scheduler).map(([id, job]) => (
        <div key={id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">{id.replace('_', ' ')}</span>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
            {job.next_run ? `Next: ${new Date(job.next_run).toLocaleTimeString()}` : 'paused'}
          </span>
        </div>
      ))}
      <div className="flex justify-end pt-1">
        <button type="button" onClick={load} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          Refresh
        </button>
      </div>
    </div>
  )
}
