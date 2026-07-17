import { useState } from 'react'
import { settingsService, type ModuleConfig, type DiscoveredModule } from '@services'
import { useSettings } from '@context'
import { Btn } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Toggle } from '../../../components/ui/toggle'
import { ErrorBanner } from '../../../components/ui/ErrorBanner'
import { PageTitle } from '../../../components/ui/PageTitle'
import { AdminPageShell } from '../../../components/layout/adminPageShell'
import type { ModalState } from './ModalState.type'
import { ModuleModal } from './ModuleModal'
import { ModuleLogsDrawer } from './ModuleLogsDrawer'

// Modules admin page — list, add, edit, delete, toggle, and view logs for platform modules
export default function Modules() {
  const { modules, refreshModules } = useSettings()                           // live module list from SettingsContext
  const [modal, setModal]           = useState<ModalState>(null)              // which modal variant is open (or null)
  const [error, setError]           = useState<string | null>(null)           // last API error message
  const [discovered, setDiscovered] = useState<DiscoveredModule[] | null>(null) // results from module registry scan
  const [scanning, setScanning]     = useState(false)                         // true while the scan API call is in flight
  const [logsModule, setLogsModule] = useState<ModuleConfig | null>(null)     // module whose logs drawer is open

  async function scanModules() {
    setScanning(true)
    try { setDiscovered(await settingsService.discoverModules()) }             // fetch modules from all registry URLs
    finally { setScanning(false) }
  }

  async function handleSave(data: Omit<ModuleConfig, 'id'>) {
    try {
      if (modal === 'add' || (modal !== null && typeof modal === 'object' && 'prefill' in modal)) {
        await settingsService.createModule(data)                               // create new module from blank or pre-filled form
      } else if (modal !== null && typeof modal === 'object' && 'id' in modal) {
        await settingsService.updateModule(modal.id, data)                    // update existing module
      }
      await refreshModules()
      setModal(null)
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this module?')) return                                // require explicit confirmation before destructive action
    try {
      await settingsService.deleteModule(id)
      await refreshModules()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle(m: ModuleConfig) {
    try {
      await settingsService.updateModule(m.id, { ...m, enabled: !m.enabled }) // flip the enabled flag in place
      await refreshModules()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleEnableDiscovered(d: DiscoveredModule) {
    if (!d.module_id) return                                                   // guard: discovered entry must have an existing DB id
    try {
      // Must spread the full ModuleConfig — the PUT endpoint requires all fields, not just enabled.
      const existing = modules.find(m => m.id === d.module_id)
      if (!existing) return
      await settingsService.updateModule(d.module_id, { ...existing, enabled: true })
      await refreshModules()
      setDiscovered(prev => prev ? prev.map(x => x.source_url === d.source_url ? { ...x, enabled: true } : x) : prev) // optimistic UI update
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <AdminPageShell>
      <PageTitle>Modules</PageTitle>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        {error && <ErrorBanner message={error} />}

        {modules.length === 0 ? (
          <p className="text-sm text-slate-500">No modules configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-2 pr-4">Module</th>
                  <th className="pb-2 pr-4">Root slug</th>
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
                      {m.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.description}</p>
                      )}
                    </td>
                    <td className="py-2 pr-4 font-mono text-slate-500 dark:text-slate-400">{m.route}</td>
                    <td className="py-2 pr-4 font-mono text-slate-500 dark:text-slate-400">{m.scope}</td>
                    <td className="py-2 pr-4">
                      <Toggle checked={m.enabled} onChange={() => handleToggle(m)} />
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Btn variant="secondary" onClick={() => setLogsModule(m)}>Logs</Btn>
                        <Btn variant="secondary" onClick={() => setModal(m)}>Edit</Btn>
                        <Btn variant="danger"    onClick={() => handleDelete(m.id)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Btn disabled>+ Add module</Btn>
          <Btn variant="secondary" disabled={scanning} onClick={scanModules}>
            {scanning ? 'Scanning…' : '🔍 Scan for modules'}
          </Btn>
        </div>

        {discovered !== null && ( // render discovery panel only after at least one scan
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Discovered modules</h3>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                onClick={() => setDiscovered(null)} // dismiss the discovery panel
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
                  <span className="text-2xl shrink-0">{d.icon ?? '🧩'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{d.name}</p>
                    {d.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d.description}</p>
                    )}
                    <p className="text-xs font-mono text-slate-400 truncate mt-0.5">{d.remote_url}</p>
                  </div>
                  {d.already_registered && d.enabled ? (
                    <Badge variant="success">Registered</Badge>
                  ) : d.already_registered && !d.enabled ? (
                    // Module is in the DB but disabled — auto-disabled by health checker or inserted
                    // inactive by startup discovery. Let the admin re-enable it directly from the scan.
                    <Btn onClick={() => handleEnableDiscovered(d)}>Enable</Btn>
                  ) : (
                    <Btn
                      onClick={() =>
                        setModal({ // open Add modal pre-filled from discovered module data
                          prefill: {
                            name:        d.name        ?? '',
                            description: d.description ?? '',
                            remote_url:  d.remote_url  ?? '',
                            scope:       d.scope       ?? '',
                            component:   d.component   ?? './App',
                            route:       d.route       ?? '',
                            icon:        d.icon        ?? '🧩',
                            enabled:     true,
                            roles:       d.roles       ?? ['user', 'admin'],
                            presets:     { i18n: {}, layout: {}, settings: {} },
                          },
                        })
                      }
                    >
                      Add
                    </Btn>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {modal && (
        <ModuleModal
          initial={modal === 'add' ? undefined : 'prefill' in modal ? modal.prefill : modal} // resolve initial values from modal discriminant
          moduleId={modal !== 'add' && typeof modal === 'object' && 'id' in modal ? modal.id : undefined} // only pass moduleId when editing
          title={modal !== 'add' && typeof modal === 'object' && 'prefill' in modal ? 'Add module' : undefined} // override title for pre-filled add
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {logsModule && (
        <ModuleLogsDrawer module={logsModule} onClose={() => setLogsModule(null)} />
      )}
    </AdminPageShell>
  )
}
