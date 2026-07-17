import { useHealth } from '@context' // health check state
import { SectionCard } from './SectionCard' // section wrapper
import { DB_ROWS } from './DB_ROWS.constant' // postgres + clickhouse row definitions

export function DbStatusSection() { // shows online/offline status per database
  const health = useHealth()
  return (
    <SectionCard title="Database Status">
      {!health.api && health.checkedAt !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block shrink-0" />
          API unreachable — database status unavailable
        </div>
      )}
      <div className="space-y-3">
        {DB_ROWS.map(({ key, icon, name, role }) => {
          const up = health[key] // per-db health flag from context
          const checkedAt = health.checkedAt
          return (
            <div key={name} className="flex items-center gap-3 text-sm">
              <span className="text-xl w-7 shrink-0">{icon}</span>
              <span className="font-medium text-slate-800 dark:text-white w-28 shrink-0">{name}</span>
              <span className="text-slate-500 dark:text-slate-400">{role}</span>
              <span className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${checkedAt === null ? 'text-slate-400' : up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${checkedAt === null ? 'bg-slate-400 animate-pulse' : up ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                {checkedAt === null ? 'checking…' : up ? 'online' : 'unreachable'}
              </span>
            </div>
          )
        })}
      </div>
      {health.checkedAt && (
        <p className="text-[11px] text-slate-400 text-right">Last checked {health.checkedAt.toLocaleTimeString()}</p>
      )}
    </SectionCard>
  )
}
