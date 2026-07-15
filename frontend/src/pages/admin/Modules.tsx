import { type InputHTMLAttributes, type ReactNode, useState } from 'react'
import { settingsService, type ModuleConfig, type DiscoveredModule } from '../../services/settingsService'
import { useSettings } from '../../context/SettingsContext'

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

const BLANK: Omit<ModuleConfig, 'id'> = {
  name: '', remote_url: '', scope: '', component: './App', route: '', icon: '🧩', enabled: true, roles: ['user', 'admin'],
}

type ModalState = 'add' | ModuleConfig | { prefill: Omit<ModuleConfig, 'id'> } | null

function ModuleModal({
  initial,
  title,
  onSave,
  onClose,
}: {
  initial?: Omit<ModuleConfig, 'id'>
  title?: string
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
        <h3 className="font-semibold text-slate-800 dark:text-white">{title ?? (initial ? 'Edit module' : 'Add module')}</h3>

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

export default function Modules() {
  const { modules, refreshModules } = useSettings()
  const [modal, setModal] = useState<ModalState>(null)
  const [error, setError] = useState<string | null>(null)
  const [discovered, setDiscovered] = useState<DiscoveredModule[] | null>(null)
  const [scanning, setScanning] = useState(false)

  async function scanModules() {
    setScanning(true)
    try { setDiscovered(await settingsService.discoverModules()) }
    finally { setScanning(false) }
  }

  async function handleSave(data: Omit<ModuleConfig, 'id'>) {
    try {
      if (modal === 'add' || (modal !== null && typeof modal === 'object' && 'prefill' in modal)) {
        await settingsService.createModule(data)
      } else if (modal !== null && typeof modal === 'object' && 'id' in modal) {
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
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">Modules</h1>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
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

        <div className="flex gap-2 flex-wrap">
          <Btn onClick={() => setModal('add')}>+ Add module</Btn>
          <Btn variant="secondary" disabled={scanning} onClick={scanModules}>
            {scanning ? 'Scanning…' : '🔍 Scan for modules'}
          </Btn>
        </div>

        {discovered !== null && (
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Discovered modules</h3>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                onClick={() => setDiscovered(null)}
              >
                ✕ Clear
              </button>
            </div>
            {discovered.length === 0 ? (
              <p className="text-sm text-slate-500">No modules found. Check MODULE_REGISTRY_URLS on the backend.</p>
            ) : (
              discovered.map(d => (
                <div
                  key={d.source_url}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700"
                >
                  {d.error ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{d.source_url}</p>
                      <p className="text-xs text-red-500 mt-0.5">{d.error}</p>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl shrink-0">{d.icon ?? '🧩'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{d.name}</p>
                        {d.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d.description}</p>
                        )}
                        <p className="text-xs font-mono text-slate-400 truncate mt-0.5">{d.remote_url}</p>
                      </div>
                      {d.already_registered ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                          Registered
                        </span>
                      ) : (
                        <Btn
                          onClick={() =>
                            setModal({
                              prefill: {
                                name: d.name ?? '',
                                remote_url: d.remote_url ?? '',
                                scope: d.scope ?? '',
                                component: d.component ?? './App',
                                route: d.route ?? '',
                                icon: d.icon ?? '🧩',
                                enabled: true,
                                roles: d.roles ?? ['user', 'admin'],
                              },
                            })
                          }
                        >
                          Add
                        </Btn>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {modal && (
        <ModuleModal
          initial={modal === 'add' ? undefined : 'prefill' in modal ? modal.prefill : modal}
          title={modal !== 'add' && typeof modal === 'object' && 'prefill' in modal ? 'Add module' : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
