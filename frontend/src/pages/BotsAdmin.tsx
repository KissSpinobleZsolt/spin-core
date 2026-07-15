import { type ReactNode, useState, useEffect } from 'react'
import { botsService, type Bot, type BotPayload, type BotType } from '../services/botsService'
import { settingsService, type ModuleConfig } from '../services/settingsService'
import { useGet } from '../hooks/useApi'
import { apiService } from '../services/apiService'
import { Btn } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Modal } from '../components/ui/Modal'
import { Toggle } from '../components/ui/Toggle'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { PageTitle } from '../components/ui/PageTitle'
import { BOT_TYPES, TYPE_BADGE } from '../constants/botConstants'
import { type InstalledModelsData } from '../services/modelStatusService'

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
  name: '', description: '', type: 'communicator', model: '',
  system_prompt: '', icon: '💬', active: false, restricted: 'user', modules: [],
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
    model: initial.model,
    system_prompt: initial.system_prompt,
    icon: initial.icon,
    active: initial.active,
    restricted: initial.restricted,
    modules: initial.modules,
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
    if (!bt) {
      setForm(f => ({ ...f, type: newType, modules: clearCore ? f.modules.filter(m => m !== 'core') : f.modules }))
      return
    }
    setForm(f => ({
      ...f,
      type: newType,
      icon: bt.icon,
      modules: clearCore ? f.modules.filter(m => m !== 'core') : f.modules,
      ...(isNew ? {
        system_prompt: f.system_prompt || bt.preprompt,
        model: f.model || bt.default_model,
      } : {}),
    }))
  }

  useEffect(() => {
    if (isNew && botTypes.length > 0) {
      const bt = botTypes.find(t => t.name === form.type)
      if (bt) {
        setForm(f => ({ ...f, icon: bt.icon }))
      }
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
            <span className="text-xl leading-none">{currentBotType?.icon ?? form.icon}</span>
            <div className="flex-1">
              <Select value={form.type} onChange={handleTypeChange}>
                {BOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this bot do?" />
      </div>

      <div>
        <Label>Model</Label>
        <input
          list="ollama-models"
          value={form.model}
          onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
          placeholder={currentBotType?.default_model || 'Default (env var)'}
          className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <datalist id="ollama-models">
          {models.map(m => <option key={m} value={m} />)}
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
        <input
          id="bot-active"
          type="checkbox"
          checked={form.active}
          disabled={form.modules.length === 0}
          onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
          className="rounded border-slate-400 disabled:opacity-40"
        />
        <label htmlFor="bot-active" className={`text-sm ${form.modules.length === 0 ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
          Active {form.modules.length === 0 && '(requires at least one module)'}
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : 'Save'}</Btn>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BotsAdmin() {
  const [modal, setModal] = useState<'add' | Bot | null>(null)
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

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {isError && <p className="text-sm text-red-500">Failed to load bots.</p>}
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[bot.type] ?? TYPE_BADGE.custom}`}>
                          {BOT_TYPES.find(t => t.value === bot.type)?.label ?? bot.type}
                        </span>
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
    </div>
  )
}
