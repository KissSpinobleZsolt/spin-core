import { type ReactNode, useState, useEffect } from 'react'
import {
  botsService, type Bot, type BotPayload, type BotType, type LLMProvider,
  PROVIDER_LABELS, PROVIDER_MODEL_HINTS,
  settingsService, type ModuleConfig,
  logsService, type BotLogEntry, type BotLogSummaryEntry, type BotLogsParams,
  apiService,
  type InstalledModelsData,
} from '@services'
import TimeRangeFilter, { defaultTimeRange, type TimeRange } from '../components/TimeRangeFilter'
import { useGet } from '../hooks/useApi'
import { Btn } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Modal } from '../components/ui/Modal'
import { Toggle } from '../components/ui/Toggle'
import { StatCard } from '../components/ui/StatCard'
import { Spinner } from '../components/ui/Spinner'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { PageTitle } from '../components/ui/PageTitle'
import { BOT_TYPES, CUSTOM_ICONS } from '../constants/botConstants'

// ---------------------------------------------------------------------------
// Select helper (local, not shared)
// ---------------------------------------------------------------------------

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {children}
    </select>
  )
}

// ---------------------------------------------------------------------------
// Bot modal
// ---------------------------------------------------------------------------

const BLANK: BotPayload = {
  name: '', description: '', type: 'communicator', provider: 'ollama', model: '',
  system_prompt: '', icon: '💬', active: false, restricted: 'user', modules: [],
  config_schema: {},
}

function BotModal({
  initial,
  botTypes,
  installedModules,
  onSave,
  onClose,
}: {
  initial?: Bot
  botTypes: BotType[]
  installedModules: ModuleConfig[]
  onSave: (payload: BotPayload) => Promise<void>
  onClose: () => void
}) {
  const isNew = initial === undefined
  const [form, setForm] = useState<BotPayload>(initial ? {
    name: initial.name,
    description: initial.description,
    type: initial.type,
    provider: initial.provider ?? 'ollama',
    model: initial.model,
    system_prompt: initial.system_prompt,
    icon: initial.icon,
    active: initial.active,
    restricted: initial.restricted,
    modules: initial.modules,
    config_schema: initial.config_schema ?? {},
  } : { ...BLANK })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: modelsData } = useGet<InstalledModelsData>(
    ['ollama-installed-models'],
    () => apiService.get<InstalledModelsData>('/model-status/installed'),
  )
  const models = modelsData?.ollama === 'ok' ? modelsData.models.map(m => m.name) : []

  function handleTypeChange(newType: string) {
    const bt = botTypes.find(t => t.name === newType)
    const clearCore = newType !== 'communicator'
    setForm(f => ({
      ...f,
      type: newType,
      // For communicator, adopt its icon; for custom, keep current icon (user picks via picker)
      ...(newType !== 'custom' && bt ? { icon: bt.icon } : {}),
      modules: clearCore ? f.modules.filter(m => m !== 'core') : f.modules,
      ...(isNew && bt ? {
        system_prompt: f.system_prompt || bt.preprompt,
        model: f.model || bt.default_model,
      } : {}),
    }))
  }

  useEffect(() => {
    if (isNew && botTypes.length > 0 && form.type !== 'custom') {
      const bt = botTypes.find(t => t.name === form.type)
      if (bt) setForm(f => ({ ...f, icon: bt.icon }))
    }
  }, [botTypes])

  function toggleModule(id: string) {
    setForm(f => ({
      ...f,
      modules: f.modules.includes(id)
        ? f.modules.filter(m => m !== id)
        : [...f.modules, id],
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const currentBotType = botTypes.find(t => t.name === form.type)

  return (
    <Modal title={isNew ? 'New bot' : 'Edit bot'} onClose={onClose}>
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Bot" />
        </div>
        <div>
          <Label>Type</Label>
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{form.type === 'custom' ? form.icon : (currentBotType?.icon ?? form.icon)}</span>
            <div className="flex-1">
              <Select value={form.type} onChange={handleTypeChange}>
                {BOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          </div>
          {form.type === 'custom' && (
            <div className="mt-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {CUSTOM_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icon: ic }))}
                    className={`text-xl px-2 py-1 rounded-lg border transition-colors ${
                      form.icon === ic
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40'
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-100 dark:bg-slate-700'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this bot do?" />
      </div>

      {/* Provider selector — determines which LLM backend the chat route calls */}
      <div>
        <Label>Provider</Label>
        <Select
          value={form.provider}
          onChange={v => setForm(f => ({
            ...f,
            provider: v as LLMProvider,
            // Clear the model when switching providers so stale identifiers
            // (e.g. an Ollama tag) are not accidentally sent to a cloud API.
            model: '',
          }))}
        >
          {(Object.entries(PROVIDER_LABELS) as [LLMProvider, string][]).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </Select>
        {form.provider !== 'ollama' && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Requires the corresponding API key set in docker-compose.yml / k8s secrets.
          </p>
        )}
      </div>

      {/* Model field — hints are provider-aware; Ollama shows installed models */}
      <div>
        <Label>Model</Label>
        <input
          list="bot-model-hints"
          value={form.model}
          onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
          placeholder={
            form.provider === 'ollama'
              ? (currentBotType?.default_model || 'Default (OLLAMA_MODEL env var)')
              : form.provider === 'anthropic'
              ? 'e.g. claude-sonnet-5'
              : 'e.g. gpt-4o'
          }
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {/* Datalist merges Ollama installed-model names with static cloud hints */}
        <datalist id="bot-model-hints">
          {form.provider === 'ollama'
            ? models.map(m => <option key={m} value={m} />)
            : PROVIDER_MODEL_HINTS[form.provider as LLMProvider].map(m => <option key={m} value={m} />)
          }
        </datalist>
      </div>

      <div>
        <Label>System prompt</Label>
        <textarea
          value={form.system_prompt}
          onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
          placeholder={currentBotType?.preprompt || 'You are a helpful assistant that...'}
          rows={4}
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y text-sm"
        />
      </div>

      <div>
        <Label>Modules</Label>
        <div className="mt-1 max-h-36 overflow-y-auto space-y-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 p-2">
          {/* Platform core — communicator only */}
          <label className={`flex items-center gap-2 px-1 py-0.5 rounded ${form.type === 'communicator' ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600' : 'cursor-not-allowed opacity-40'}`}>
            <input
              type="checkbox"
              checked={form.modules.includes('core')}
              disabled={form.type !== 'communicator'}
              onChange={() => toggleModule('core')}
              className="rounded border-slate-400 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">🧩 Platform (core)</span>
            {form.type !== 'communicator' && (
              <span className="ml-auto text-xs text-slate-400 italic">Communicator only</span>
            )}
          </label>
          {installedModules.map(mod => (
            <label key={mod.id} className="flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600">
              <input
                type="checkbox"
                checked={form.modules.includes(mod.id)}
                onChange={() => toggleModule(mod.id)}
                className="rounded border-slate-400"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">{mod.icon} {mod.name}</span>
            </label>
          ))}
          {installedModules.length === 0 && (
            <p className="text-xs text-slate-400 px-1 py-0.5">No installed modules found.</p>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Select <code>core</code> to show in ChatBubble. Bots with only core are hidden from /bots.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Toggle
          checked={form.active}
          disabled={form.modules.length === 0}
          onChange={v => setForm(f => ({ ...f, active: v }))}
        />
        <span className={`text-sm ${form.modules.length === 0 ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
          Active {form.modules.length === 0 && '(requires at least one module)'}
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : 'Save'}</Btn>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Bot logs drawer
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50

const LEVEL_VARIANT: Record<string, 'info' | 'warn' | 'error'> = {
  INFO: 'info', WARN: 'warn', ERROR: 'error',
}

function LevelBadge({ level }: { level: string }) {
  return <Badge variant={LEVEL_VARIANT[level] ?? 'info'}>{level || 'INFO'}</Badge>
}

function BotLogsDrawer({ bot, onClose }: { bot: Bot; onClose: () => void }) {
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

  useEffect(() => {
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

  const totalEvents = summary.reduce((a, s) => a + (s.event_count ?? 0), 0)
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BotsAdmin() {
  const [modal, setModal] = useState<'add' | Bot | null>(null)
  const [logsBot, setLogsBot] = useState<Bot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: bots = [], isLoading, isError, refetch } = useGet<Bot[]>(
    ['bots-admin'],
    () => botsService.getBots(),
  )

  const { data: botTypes = [] } = useGet<BotType[]>(
    ['bot-types'],
    () => botsService.getBotTypes(),
  )

  const { data: allModules = [] } = useGet<ModuleConfig[]>(
    ['modules-list'],
    () => settingsService.getModules(),
  )
  const installedModules = allModules.filter(m => m.enabled)

  async function handleSave(payload: BotPayload) {
    if (modal === 'add') {
      await botsService.createBot(payload)
    } else if (modal && typeof modal === 'object') {
      await botsService.updateBot(modal.id, payload)
    }
    await refetch()
    setModal(null)
  }

  async function handleDelete(bot: Bot) {
    if (!confirm(`Delete "${bot.name}"?`)) return
    try {
      await botsService.deleteBot(bot.id)
      await refetch()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle(bot: Bot) {
    try {
      // Spread the full bot into BotPayload; created_by and created_at are server-only.
      const { id, created_by, created_at, ...payload } = bot
      await botsService.updateBot(id, { ...payload, active: !bot.active })
      await refetch()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageTitle>Bots</PageTitle>

      {isLoading && <Spinner />}
      {isError && <ErrorBanner message="Failed to load bots." />}
      {error && <ErrorBanner message={error} />}

      {!isLoading && !isError && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          {bots.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No bots configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 pr-4">Bot</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Provider</th>
                    <th className="pb-2 pr-4">Model</th>
                    <th className="pb-2 pr-4">Created by</th>
                    <th className="pb-2 pr-4">Active</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {bots.map(bot => (
                    <tr key={bot.id}>
                      <td className="py-2 pr-4">
                        <span className="mr-2">{bot.icon}</span>
                        <span className="font-medium text-slate-800 dark:text-white">{bot.name}</span>
                        {bot.description && (
                          <span className="ml-2 text-slate-400 dark:text-slate-500 text-xs truncate max-w-[160px] inline-block align-middle">
                            {bot.description}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={bot.type === 'communicator' ? 'info' : 'neutral'}>
                          {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        <Badge variant={bot.provider === 'anthropic' ? 'warn' : bot.provider === 'openai' ? 'success' : 'neutral'}>
                          {bot.provider ?? 'ollama'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {bot.model || <span className="italic">default</span>}
                      </td>
                      <td className="py-2 pr-4 text-slate-500 dark:text-slate-400 text-xs truncate max-w-[140px]">
                        {bot.created_by || <span className="italic">system</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <Toggle checked={bot.active} onChange={() => handleToggle(bot)} disabled={bot.modules.length === 0} />
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Btn variant="secondary" onClick={() => setLogsBot(bot)}>Logs</Btn>
                          <Btn variant="secondary" onClick={() => setModal(bot)}>Edit</Btn>
                          <Btn variant="danger" onClick={() => handleDelete(bot)}>Delete</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Btn onClick={() => setModal('add')}>+ Add bot</Btn>
        </div>
      )}

      {modal !== null && (
        <BotModal
          initial={modal === 'add' ? undefined : modal}
          botTypes={botTypes}
          installedModules={installedModules}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {logsBot && <BotLogsDrawer bot={logsBot} onClose={() => setLogsBot(null)} />}
    </div>
  )
}
