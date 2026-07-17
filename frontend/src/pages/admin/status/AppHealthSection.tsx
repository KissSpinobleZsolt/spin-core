import { useHealth } from '@context' // health check state
import { SectionCard } from './SectionCard' // section wrapper card

export function AppHealthSection() { // shows API liveness and last check time
  const health = useHealth()
  const apiUp = health.api // whether the API is reachable
  const checkedAt = health.checkedAt // null while first check is pending

  return (
    <SectionCard title="App Health">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-xl w-7 shrink-0">🌐</span>
        <span className="font-medium text-slate-800 dark:text-white w-20 shrink-0">API</span>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${apiUp ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${checkedAt === null ? 'bg-slate-400 animate-pulse' : apiUp ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          {checkedAt === null ? 'checking…' : apiUp ? 'online' : 'unreachable'}
        </span>
      </div>
      {health.checkedAt && (
        <p className="text-[11px] text-slate-400 text-right">Last checked {health.checkedAt.toLocaleTimeString()}</p>
      )}
    </SectionCard>
  )
}
