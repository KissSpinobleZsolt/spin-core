import { type InputHTMLAttributes, type ReactNode, useEffect, useState } from 'react'
import { settingsService, type ModuleConfig } from '../services/settingsService'
import { useSettings } from '../context/SettingsContext'
import { useTheme } from '../context/ThemeContext'

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
// Module modal
// ---------------------------------------------------------------------------

const BLANK: Omit<ModuleConfig, 'id'> = {
  name: '', remote_url: '', scope: '', component: './App', route: '', icon: '🧩', enabled: true, roles: ['user', 'admin'],
}

function ModuleModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ModuleConfig
  onSave: (m: Omit<ModuleConfig, 'id'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<ModuleConfig, 'id'>>(initial ? { ...initial } : { ...BLANK })

  const valid =
    form.name.trim().length > 0 &&
    form.remote_url.startsWith('http') &&
    form.scope.trim().length > 0 &&
    form.route.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-white">{initial ? 'Edit module' : 'Add module'}</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Analytics" />
          </div>
          <div>
            <Label>Icon</Label>
            <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="📊" />
          </div>
        </div>
        <div>
          <Label>Remote entry URL</Label>
          <Input value={form.remote_url} onChange={e => setForm(f => ({ ...f, remote_url: e.target.value }))} placeholder="http://host/remoteEntry.js" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Scope</Label>
            <Input value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} placeholder="analyticsRemote" />
          </div>
          <div>
            <Label>Component</Label>
            <Input value={form.component} onChange={e => setForm(f => ({ ...f, component: e.target.value }))} placeholder="./App" />
          </div>
        </div>
        <div>
          <Label>Route slug</Label>
          <Input value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} placeholder="analytics" />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="enabled"
            type="checkbox"
            checked={form.enabled}
            onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
            className="rounded border-slate-400"
          />
          <label htmlFor="enabled" className="text-sm text-slate-600 dark:text-slate-300">Enabled</label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(form)} disabled={!valid}>Save</Btn>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modules section
// ---------------------------------------------------------------------------

function ModulesSection() {
  const { modules, refreshModules } = useSettings()
  const [modal, setModal] = useState<'add' | ModuleConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(data: Omit<ModuleConfig, 'id'>) {
    try {
      if (modal === 'add') {
        await settingsService.createModule(data)
      } else if (modal && typeof modal === 'object') {
        await settingsService.updateModule(modal.id, data)
      }
      await refreshModules()
      setModal(null)
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this module?')) return
    try {
      await settingsService.deleteModule(id)
      await refreshModules()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle(m: ModuleConfig) {
    try {
      await settingsService.updateModule(m.id, { ...m, enabled: !m.enabled })
      await refreshModules()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <Section title="Modules">
      {error && (
        <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {modules.length === 0 ? (
        <p className="text-sm text-slate-500">No modules configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 pr-4">Module</th>
                <th className="pb-2 pr-4">Route</th>
                <th className="pb-2 pr-4">Scope</th>
                <th className="pb-2 pr-4">Enabled</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {modules.map(m => (
                <tr key={m.id}>
                  <td className="py-2 pr-4">
                    <span className="mr-2">{m.icon}</span>
                    <span className="font-medium text-slate-800 dark:text-white">{m.name}</span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-slate-500 dark:text-slate-400">/modules/{m.id}</td>
                  <td className="py-2 pr-4 font-mono text-slate-500 dark:text-slate-400">{m.scope}</td>
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(m)}
                      className={`w-10 h-5 rounded-full transition-colors ${m.enabled ? 'bg-blue-500' : 'bg-slate-400'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${m.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Btn variant="secondary" onClick={() => setModal(m)}>Edit</Btn>
                      <Btn variant="danger" onClick={() => handleDelete(m.id)}>Delete</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Btn onClick={() => setModal('add')}>+ Add module</Btn>

      {modal && (
        <ModuleModal
          initial={modal !== 'add' ? modal : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </Section>
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

function DatabaseSection() {
  const [dbType, setDbType] = useState<string | null>(null)

  useEffect(() => {
    settingsService.getSettings().then(s => setDbType(s.db_type)).catch(() => {})
  }, [])

  return (
    <Section title="Database">
      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="text-xl">
          {dbType === 'postgres' ? '🐘' : dbType === 'mongodb' ? '🍃' : dbType === 'clickhouse' ? '🏠' : '…'}
        </span>
        <span>
          {dbType === 'postgres' ? 'PostgreSQL' : dbType === 'mongodb' ? 'MongoDB' : dbType === 'clickhouse' ? 'ClickHouse' : 'Loading…'}
        </span>
        <span className="text-slate-400 dark:text-slate-500 text-xs">(read-only — set during initial setup)</span>
      </div>
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
      <ModulesSection />
      <AppearanceSection />
      <DatabaseSection />
    </div>
  )
}
