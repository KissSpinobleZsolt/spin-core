import { useState, useEffect } from 'react' // modal state
import {
  type Bot, type BotPayload, type BotType, type LLMProvider,
  PROVIDER_LABELS, PROVIDER_MODEL_HINTS,
  type ModuleConfig,
  apiService,
  type InstalledModelsData,
} from '@services' // bot + module service calls
import { useGet } from '@hooks' // installed models fetch
import { Btn } from '../../components/ui/button' // action buttons
import { Input } from '../../components/ui/input' // text input
import { Label } from '../../components/ui/Label' // form label
import { Modal } from '../../components/ui/modal' // modal wrapper
import { Toggle } from '../../components/ui/toggle' // active toggle
import { ErrorBanner } from '../../components/ui/ErrorBanner' // save error
import { BOT_TYPES, CUSTOM_ICONS } from '../../constants/botConstants' // type options + icon picker
import { Select } from './Select' // local dropdown wrapper
import { BLANK } from './BLANK.constant' // empty form defaults

export function BotModal({ // create / edit bot form inside a modal
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
  const isNew = initial === undefined // true when adding a new bot
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

  const { data: modelsData } = useGet<InstalledModelsData>( // fetch installed Ollama models for datalist
    ['ollama-installed-models'],
    () => apiService.get<InstalledModelsData>('/model-status/installed'),
  )
  const models = modelsData?.ollama === 'ok' ? modelsData.models.map(m => m.name) : []

  function handleTypeChange(newType: string) { // changing type may auto-fill icon, system prompt, and default model
    const bt = botTypes.find(t => t.name === newType)
    const clearCore = newType !== 'communicator' // non-communicator bots cannot have the system module
    setForm(f => ({
      ...f,
      type: newType,
      // For communicator, adopt its icon; for custom, keep current icon (user picks via picker)
      ...(newType !== 'custom' && bt ? { icon: bt.icon } : {}),
      modules: clearCore ? f.modules.filter(m => m !== 'system') : f.modules,
      ...(isNew && bt ? {
        system_prompt: f.system_prompt || bt.preprompt,
        model: f.model || bt.default_model,
      } : {}),
    }))
  }

  useEffect(() => { // sync icon when bot types load for a new bot
    if (isNew && botTypes.length > 0 && form.type !== 'custom') {
      const bt = botTypes.find(t => t.name === form.type)
      if (bt) setForm(f => ({ ...f, icon: bt.icon }))
    }
  }, [botTypes])

  function toggleModule(id: string) { // toggle a module subscription on/off
    setForm(f => ({
      ...f,
      modules: f.modules.includes(id)
        ? f.modules.filter(m => m !== id)
        : [...f.modules, id],
    }))
  }

  async function handleSave() { // call parent save and surface any errors
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
          {/* System subscription — communicator only */}
          <label className={`flex items-center gap-2 px-1 py-0.5 rounded ${form.type === 'communicator' ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600' : 'cursor-not-allowed opacity-40'}`}>
            <input
              type="checkbox"
              checked={form.modules.includes('system')}
              disabled={form.type !== 'communicator'}
              onChange={() => toggleModule('system')}
              className="rounded border-slate-400 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">🖥️ Platform (system)</span>
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
          Select <code>system</code> to show in ChatBubble. Bots with only system are hidden from /bots.
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
