import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Bot, type BotConfigSchemaField } from '../services/botsService'
import {
  botConfigService,
  type BotEntity,
  type BotTeam,
  type BotProcesses,
} from '../services/botConfigService'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Btn } from '../components/ui/Button'
import { Toggle } from '../components/ui/Toggle'
import { BOT_TYPES, TYPE_BADGE } from '../constants/botConstants'

// ── Severity colours ──────────────────────────────────────────────────────────

const SEVERITY_COLOURS: Record<string, string> = {
  INFO: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const RISK_LEVELS = ['Conservative', 'Moderate', 'Aggressive'] as const

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-1 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
    >
      {title}
      <span className="text-slate-300 dark:text-slate-600">{open ? '▲' : '▼'}</span>
    </button>
  )
}

function ConfigFieldRow({
  field,
  value,
  onChange,
}: {
  field: BotConfigSchemaField
  value: unknown
  onChange: (key: string, v: unknown) => void
}) {
  const current = value !== undefined ? value : field.default

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <span className="text-sm text-slate-700 dark:text-slate-300">{field.label}</span>
        <Toggle checked={Boolean(current)} onChange={(v) => onChange(field.key, v)} />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{field.label}</span>
        <select
          value={String(current)}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="text-sm rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{field.label}</span>
      <input
        type={field.type === 'password' ? 'password' : 'number'}
        value={field.type === 'number' ? Number(current) : String(current)}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) =>
          onChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)
        }
        className="w-32 text-sm rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

// ── Watchlist principals ───────────────────────────────────────────────────────

function WatchlistSection({
  entities,
  teams,
  scope,
  botId,
  onEntitiesChange,
}: {
  entities: BotEntity[]
  teams: BotTeam[]
  scope: string
  botId: string
  onEntitiesChange: (updated: BotEntity[]) => void
}) {
  const [addSymbol, setAddSymbol] = useState('')
  const [addTeamId, setAddTeamId] = useState(teams[0]?.id ?? '')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  async function handleAdd() {
    if (!addSymbol.trim() || !addTeamId) return
    setAdding(true)
    setAddError('')
    try {
      const entity = await botConfigService.addEntity(scope, botId, {
        team_id: addTeamId,
        symbol: addSymbol.trim().toUpperCase(),
      })
      onEntitiesChange([...entities, entity])
      setAddSymbol('')
    } catch {
      setAddError('Failed to add symbol — check the ticker is valid.')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(entity: BotEntity, active: boolean) {
    onEntitiesChange(entities.map((e) => (e.id === entity.id ? { ...e, active } : e)))
    try {
      await botConfigService.patchEntity(scope, entity.id, { active })
    } catch {
      onEntitiesChange(entities.map((e) => (e.id === entity.id ? { ...e, active: entity.active } : e)))
    }
  }

  async function handleDelete(entityId: string) {
    onEntitiesChange(entities.filter((e) => e.id !== entityId))
    try {
      await botConfigService.deleteEntity(scope, entityId)
    } catch {
      // deletion failed silently; a manual refresh will restore it
    }
  }

  const grouped = teams.reduce<Record<string, BotEntity[]>>((acc, t) => {
    acc[t.id] = entities.filter((e) => e.team_id === t.id)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <div key={team.id}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">{team.name}</p>
          <div className="space-y-1">
            {grouped[team.id]?.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 px-3 py-2 italic">No symbols tracked yet.</p>
            )}
            {grouped[team.id]?.map((entity) => (
              <div key={entity.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <code className="text-xs font-mono font-bold text-slate-800 dark:text-white w-16 shrink-0">{entity.symbol}</code>
                <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">{entity.display_name || entity.symbol}</span>
                {entity.exchange && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">{entity.exchange}</span>
                )}
                <Toggle checked={entity.active} onChange={(v) => handleToggle(entity, v)} />
                <button type="button" onClick={() => handleDelete(entity.id)} className="text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors shrink-0" title="Remove">✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <input
          type="text"
          value={addSymbol}
          onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Ticker (e.g. AAPL)"
          className="flex-1 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={addTeamId}
          onChange={(e) => setAddTeamId(e.target.value)}
          className="text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Btn onClick={handleAdd} disabled={adding || !addSymbol.trim()} className="px-4 py-2 text-sm shrink-0">
          {adding ? <Spinner size="sm" /> : '+ Add'}
        </Btn>
      </div>
      {addError && <p className="text-xs text-red-500 px-1">{addError}</p>}
    </div>
  )
}

// ── Risk profiles principals ──────────────────────────────────────────────────

function RiskProfilesSection({
  teams,
  config,
  onConfigChange,
}: {
  teams: BotTeam[]
  config: Record<string, unknown>
  onConfigChange: (key: string, v: unknown) => void
}) {
  const profiles = (config.risk_profiles as Record<string, string>) ?? {}
  return (
    <div className="space-y-1.5">
      {teams.map((team) => (
        <div key={team.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{team.name}</span>
          <select
            value={profiles[team.id] ?? 'Moderate'}
            onChange={(e) => onConfigChange('risk_profiles', { ...profiles, [team.id]: e.target.value })}
            className="text-sm rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {RISK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

// ── Teams read-only principals ────────────────────────────────────────────────

function TeamsSection({ teams }: { teams: BotTeam[] }) {
  if (teams.length === 0) {
    return (
      <p className="text-xs text-slate-400 dark:text-slate-500 px-3 py-2 italic">
        No teams assigned yet. Assign this bot to a team from the Teams view.
      </p>
    )
  }
  return (
    <div className="space-y-1.5">
      {teams.map((t) => (
        <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{t.name}</span>
          {t.role && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{t.role}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Processes section ─────────────────────────────────────────────────────────

function ProcessesSection({ scope, botId }: { scope: string; botId: string }) {
  const [data, setData] = useState<BotProcesses | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
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
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITY_COLOURS[data.last_signal.severity] ?? ''}`}>
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-white">{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BotConfigPage({ bot, scope }: { bot: Bot; scope: string }) {
  const navigate = useNavigate()
  const botId = bot.id
  const schema = bot.config_schema ?? {}

  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [teams, setTeams] = useState<BotTeam[]>([])
  const [entities, setEntities] = useState<BotEntity[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  const [open, setOpen] = useState({
    principals: true,
    configurations: true,
    processes: false,
    scheduler: true,
  })

  const configFields = schema.configurations ?? []
  const schedulerFields = schema.scheduler ?? []
  const principalsType = schema.principals
  const showWatchlist = principalsType === 'watchlist'

  useEffect(() => {
    setLoadingConfig(true)
    botConfigService.getConfig(scope, botId)
      .then(({ config: c, teams: t }) => { setConfig(c); setTeams(t) })
      .catch(() => {})
      .finally(() => setLoadingConfig(false))
  }, [scope, botId])

  useEffect(() => {
    if (!showWatchlist) { setLoadingEntities(false); return }
    setLoadingEntities(true)
    botConfigService.getEntities(scope, botId)
      .then(setEntities)
      .catch(() => {})
      .finally(() => setLoadingEntities(false))
  }, [scope, botId, showWatchlist])

  function handleConfigChange(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveOk(false)
    try {
      const result = await botConfigService.updateConfig(scope, botId, config)
      setConfig(result.config)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    } catch {
      setSaveError('Save failed — check connection to the module backend.')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (section: keyof typeof open) =>
    setOpen((prev) => ({ ...prev, [section]: !prev[section] }))

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
        <button
          type="button"
          onClick={() => navigate('/bots')}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
          title="Back to bots"
        >←</button>
        <span className="text-2xl">{bot.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white text-sm">{bot.name}</p>
          {bot.description && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{bot.description}</p>}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_BADGE[bot.type] ?? TYPE_BADGE.custom}`}>
          {BOT_TYPES.find((t) => t.value === bot.type)?.label ?? bot.type}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50 dark:bg-slate-900 rounded-b-xl">

        {/* Principals — shown only when schema declares a principals type */}
        {principalsType && (
          <section>
            <SectionHeader title="Principals" open={open.principals} onToggle={() => toggle('principals')} />
            {open.principals && (
              <div className="mt-2">
                {loadingConfig || loadingEntities ? (
                  <div className="flex justify-center py-4"><Spinner /></div>
                ) : showWatchlist ? (
                  <WatchlistSection entities={entities} teams={teams} scope={scope} botId={botId} onEntitiesChange={setEntities} />
                ) : principalsType === 'risk_profiles' ? (
                  <RiskProfilesSection teams={teams} config={config} onConfigChange={handleConfigChange} />
                ) : (
                  <TeamsSection teams={teams} />
                )}
              </div>
            )}
          </section>
        )}

        {/* Configurations */}
        {configFields.length > 0 && (
          <section>
            <SectionHeader title="Configurations" open={open.configurations} onToggle={() => toggle('configurations')} />
            {open.configurations && (
              <div className="mt-2 space-y-1.5">
                {configFields.map((field) => (
                  <ConfigFieldRow key={field.key} field={field} value={config[field.key]} onChange={handleConfigChange} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Processes */}
        <section>
          <SectionHeader title="Processes" open={open.processes} onToggle={() => toggle('processes')} />
          {open.processes && (
            <div className="mt-2">
              <ProcessesSection scope={scope} botId={botId} />
            </div>
          )}
        </section>

        {/* Scheduler */}
        {schedulerFields.length > 0 && (
          <section>
            <SectionHeader title="Scheduler" open={open.scheduler} onToggle={() => toggle('scheduler')} />
            {open.scheduler && (
              <div className="mt-2 space-y-1.5">
                {schedulerFields.map((field) => (
                  <ConfigFieldRow key={field.key} field={field} value={config[field.key]} onChange={handleConfigChange} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Save bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          {saveError ? (
            <p className="text-xs text-red-500">{saveError}</p>
          ) : saveOk ? (
            <p className="text-xs text-emerald-500">Saved</p>
          ) : (
            <span />
          )}
          <Btn onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm">
            {saving ? <Spinner size="sm" /> : 'Save changes'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
