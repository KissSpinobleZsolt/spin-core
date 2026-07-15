import { useNavigate } from 'react-router-dom'
import { useHealth } from '../../context/HealthContext'
import { useSettings } from '../../context/SettingsContext'
import { useGet } from '../../hooks/useApi'
import { apiService } from '../../services/apiService'
import { botsService, type Bot } from '../../services/botsService'

type InstalledModel = {
  name: string
  family: string | null
  parameter_size: string | null
  size_bytes: number | null
}

type InstalledModelsData = {
  ollama: 'ok' | 'unreachable'
  models: InstalledModel[]
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${bytes} B`
}

function SectionCard({
  title,
  navigateTo,
  children,
}: {
  title: string
  navigateTo?: string
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        {navigateTo ? (
          <button
            type="button"
            onClick={() => navigate(navigateTo)}
            className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {title}
            <span className="text-sm">›</span>
          </button>
        ) : (
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
        )}
      </div>
      {children}
    </div>
  )
}

function AppHealthSection() {
  const health = useHealth()
  const apiUp = health.api
  const checkedAt = health.checkedAt

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

const DB_ROWS: { key: 'postgres' | 'clickhouse' | 'mongo'; icon: string; name: string; role: string }[] = [
  { key: 'postgres',   icon: '🐘', name: 'PostgreSQL',  role: 'Users & application data' },
  { key: 'clickhouse', icon: '🏠', name: 'ClickHouse',  role: 'Event logs & audit trail' },
  { key: 'mongo',      icon: '🍃', name: 'MongoDB',     role: 'Module data store' },
]

function DbStatusSection() {
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
          const up = health[key]
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

function InstalledLLMsSection() {
  const { data, isLoading } = useGet<InstalledModelsData>(
    ['status-llms'],
    () => apiService.get<InstalledModelsData>('/model-status/installed'),
  )

  return (
    <SectionCard title="Installed LLMs" navigateTo="/admin/llms">
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {data?.ollama === 'unreachable' && (
        <p className="text-sm text-amber-600 dark:text-amber-400">Ollama unreachable</p>
      )}
      {data?.ollama === 'ok' && data.models.length === 0 && (
        <p className="text-sm text-slate-500">No models installed.</p>
      )}
      {data?.ollama === 'ok' && data.models.length > 0 && (
        <div className="space-y-2">
          {data.models.map(m => (
            <div key={m.name} className="flex items-center gap-3 text-sm">
              <span className="font-mono font-medium text-slate-800 dark:text-white truncate flex-1">{m.name}</span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">{m.family ?? '—'}</span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">{m.parameter_size ?? '—'}</span>
              <span className="text-slate-400 shrink-0 text-xs">
                {m.size_bytes != null ? fmtBytes(m.size_bytes) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function ModulesStatusSection() {
  const { modules } = useSettings()
  const installed = modules.length
  const active = modules.filter(m => m.enabled).length

  return (
    <SectionCard title="Modules" navigateTo="/admin/modules">
      {installed === 0 ? (
        <p className="text-sm text-slate-500">No modules configured.</p>
      ) : (
        <div className="space-y-2">
          {modules.map(m => (
            <div key={m.id} className="flex items-center gap-3 text-sm">
              <span className="text-lg w-7 shrink-0">{m.icon}</span>
              <span className="font-medium text-slate-800 dark:text-white flex-1 truncate">{m.name}</span>
              <span className="font-mono text-xs text-slate-400">/modules/{m.id}</span>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${m.enabled ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                {m.enabled ? 'active' : 'disabled'}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">{active} active of {installed} installed</p>
    </SectionCard>
  )
}

function ActiveBotsSection() {
  const { data, isLoading } = useGet<Bot[]>(
    ['status-bots'],
    () => botsService.getBots(),
  )

  const activeBots = data?.filter(b => b.enabled) ?? []

  return (
    <SectionCard title="Active Bots" navigateTo="/bots-admin">
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {!isLoading && activeBots.length === 0 && (
        <p className="text-sm text-slate-500">No active bots.</p>
      )}
      {activeBots.length > 0 && (
        <div className="space-y-2">
          {activeBots.map(b => (
            <div key={b.id} className="flex items-center gap-3 text-sm">
              <span className="text-lg w-7 shrink-0">{b.icon}</span>
              <span className="font-medium text-slate-800 dark:text-white flex-1 truncate">{b.name}</span>
              <span className="text-xs text-slate-400 shrink-0">{b.type}</span>
              <span className="font-mono text-xs text-slate-400 shrink-0 truncate max-w-[12rem]">{b.model}</span>
            </div>
          ))}
        </div>
      )}
      {data && (
        <p className="text-xs text-slate-400">{activeBots.length} active of {data.length} total</p>
      )}
    </SectionCard>
  )
}

export default function Status() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Status</h1>
      <AppHealthSection />
      <DbStatusSection />
      <InstalledLLMsSection />
      <ModulesStatusSection />
      <ActiveBotsSection />
    </div>
  )
}
