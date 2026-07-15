import { type InputHTMLAttributes, type ReactNode } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useHealth } from '../context/HealthContext'
import { useGet } from '../hooks/useApi'
import { apiService } from '../services/apiService'

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-800 dark:text-white">{title}</h2>
      {children}
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{children}</label>
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${props.className ?? ''}`}
    />
  )
}

function Btn({
  children,
  variant = 'primary',
  disabled,
  onClick,
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  onClick?: () => void
}) {
  const base = 'px-3 py-1.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  }
  return (
    <button type="button" className={`${base} ${variants[variant]}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Appearance section
// ---------------------------------------------------------------------------

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <Section title="Appearance">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600 dark:text-slate-300">Default theme</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
          {(['dark', 'light'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                theme === t
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Database info section
// ---------------------------------------------------------------------------

type DbKey = 'postgres' | 'clickhouse'

const DB_ROWS: { key: DbKey; icon: string; name: string; role: string }[] = [
  { key: 'postgres',   icon: '🐘', name: 'PostgreSQL', role: 'Users & application data' },
  { key: 'clickhouse', icon: '🏠', name: 'ClickHouse',  role: 'Event logs & audit trail' },
]

function StatusBadge({ up, checkedAt }: { up: boolean; checkedAt: Date | null }) {
  const label = checkedAt === null ? 'checking…' : up ? 'online' : 'unreachable'
  const dot = checkedAt === null
    ? 'bg-slate-400 animate-pulse'
    : up
    ? 'bg-green-500'
    : 'bg-red-500 animate-pulse'
  const text = checkedAt === null
    ? 'text-slate-400'
    : up
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-500 dark:text-red-400'

  return (
    <span className={`ml-auto flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${dot}`} />
      {label}
    </span>
  )
}

function DatabaseSection() {
  const health = useHealth()

  return (
    <Section title="Databases">
      {!health.api && health.checkedAt !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block shrink-0" />
          API unreachable — database status unavailable
        </div>
      )}
      <div className="space-y-3">
        {DB_ROWS.map(({ key, icon, name, role }) => (
          <div key={name} className="flex items-center gap-3 text-sm">
            <span className="text-xl w-7 shrink-0">{icon}</span>
            <span className="font-medium text-slate-800 dark:text-white w-28 shrink-0">{name}</span>
            <span className="text-slate-500 dark:text-slate-400">{role}</span>
            <StatusBadge up={health[key]} checkedAt={health.checkedAt} />
          </div>
        ))}
      </div>
      {health.checkedAt && (
        <p className="text-[11px] text-slate-400 text-right">
          Last checked {health.checkedAt.toLocaleTimeString()}
        </p>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Ollama models section
// ---------------------------------------------------------------------------

type InstalledModel = {
  name: string
  size_bytes: number | null
  modified_at: string | null
  family: string | null
  parameter_size: string | null
  quantization: string | null
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

function OllamaModelsSection() {
  const { data, isLoading, isError, refetch } = useGet<InstalledModelsData>(
    ['ollama-installed-models'],
    () => apiService.get<InstalledModelsData>('/model-status/installed'),
  )

  return (
    <Section title="Ollama models">
      {isLoading && (
        <p className="text-sm text-slate-500">Loading…</p>
      )}
      {isError && (
        <p className="text-sm text-red-500">Failed to reach backend.</p>
      )}
      {data?.ollama === 'unreachable' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block shrink-0" />
          Ollama unreachable — no model information available
        </div>
      )}
      {data?.ollama === 'ok' && data.models.length === 0 && (
        <p className="text-sm text-slate-500">No models installed yet.</p>
      )}
      {data?.ollama === 'ok' && data.models.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 pr-4">Model</th>
                <th className="pb-2 pr-4">Family</th>
                <th className="pb-2 pr-4">Params</th>
                <th className="pb-2 pr-4">Quantization</th>
                <th className="pb-2 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {data.models.map(m => (
                <tr key={m.name}>
                  <td className="py-2 pr-4 font-mono font-medium text-slate-800 dark:text-white">{m.name}</td>
                  <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{m.family ?? '—'}</td>
                  <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{m.parameter_size ?? '—'}</td>
                  <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{m.quantization ?? '—'}</td>
                  <td className="py-2 text-right text-slate-500 dark:text-slate-400">
                    {m.size_bytes != null ? fmtBytes(m.size_bytes) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && (
        <div className="flex justify-end">
          <Btn variant="secondary" onClick={() => refetch()}>↻ Refresh</Btn>
        </div>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Settings() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h1>
      <AppearanceSection />
      <DatabaseSection />
      <OllamaModelsSection />
    </div>
  )
}
