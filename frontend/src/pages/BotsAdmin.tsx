import { type InputHTMLAttributes, type ReactNode, useState } from 'react'
import { botsService, type Bot, type BotPayload } from '../services/botsService'
import { useGet } from '../hooks/useApi'
import { apiService } from '../services/apiService'

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

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
// Bot types
// ---------------------------------------------------------------------------

const BOT_TYPES = [
  { value: 'chatbot',  label: 'Chatbot' },
  { value: 'watchbot', label: 'Watch Bot' },
  { value: 'tradebot', label: 'Trade Bot' },
  { value: 'custom',   label: 'Custom' },
]

const TYPE_BADGE: Record<string, string> = {
  chatbot:  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  watchbot: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  tradebot: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  custom:   'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
}

// ---------------------------------------------------------------------------
// Installed models
// ---------------------------------------------------------------------------

type InstalledModelsData = {
  ollama: 'ok' | 'unreachable'
  models: { name: string }[]
}

// ---------------------------------------------------------------------------
// Bot modal
// ---------------------------------------------------------------------------

const BLANK: BotPayload = {
  name: '', description: '', type: 'chatbot', model: '', system_prompt: '',
  icon: '🤖', enabled: true, roles: ['user', 'admin'],
}

function BotModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Bot
  onSave: (payload: BotPayload) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<BotPayload>(initial ? { ...initial } : { ...BLANK })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: modelsData } = useGet<InstalledModelsData>(
    ['ollama-installed-models'],
    () => apiService.get<InstalledModelsData>('/model-status/installed'),
  )
  const models = modelsData?.ollama === 'ok' ? modelsData.models.map(m => m.name) : []

  function toggleRole(role: string) {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-slate-800 dark:text-white">{initial ? 'Edit bot' : 'New bot'}</h3>

        {error && (
          <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Bot" />
          </div>
          <div>
            <Label>Icon</Label>
            <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🤖" />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this bot do?" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))}>
              {BOT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Model</Label>
            <input
              list="ollama-models"
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              placeholder="Default (env var)"
              className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <datalist id="ollama-models">
              {models.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
        </div>

        <div>
          <Label>System prompt</Label>
          <textarea
            value={form.system_prompt}
            onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
            placeholder="You are a helpful assistant that..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y text-sm"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              id="bot-enabled"
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-slate-400"
            />
            <label htmlFor="bot-enabled" className="text-sm text-slate-600 dark:text-slate-300">Enabled</label>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-300">Roles:</span>
            {['user', 'admin'].map(role => (
              <label key={role} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="rounded border-slate-400"
                />
                {role}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : 'Save'}</Btn>
        </div>
      </div>
    </div>
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
      await botsService.updateBot(bot.id, { ...bot, enabled: !bot.enabled })
      await refetch()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Bots</h1>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {isError && <p className="text-sm text-red-500">Failed to load bots.</p>}
      {error && (
        <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

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
                    <th className="pb-2 pr-4">Roles</th>
                    <th className="pb-2 pr-4">Enabled</th>
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
                      <td className="py-2 pr-4 text-slate-500 dark:text-slate-400 text-xs">
                        {bot.roles.join(', ') || 'all'}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={() => handleToggle(bot)}
                          className={`w-10 h-5 rounded-full transition-colors ${bot.enabled ? 'bg-blue-500' : 'bg-slate-400'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${bot.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
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
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
