import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { settingsService, pagesService, type ModuleConfig, type DiscoveredModule, type PageConfig } from '@services'
import { useSettings } from '@context'
import { useGet } from '@hooks'
import { Btn } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Toggle } from '@components/ui/toggle'
import { Tabs } from '@components/ui/tabs'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { PageTitle } from '@components/ui/PageTitle'
import type { ModalState } from './ModalState.type'
import { ModuleModal } from './ModuleModal'
import { ModuleLogsDrawer } from './ModuleLogsDrawer'

type TabKey = 'native' | 'federation'

// Static tab definitions — labels displayed by the Tabs component
const TABS = [
  { key: 'native',      label: 'Native pages' },   // platform pages seeded from page_registry at startup
  { key: 'federation',  label: 'Federation' },      // Webpack Module Federation remote modules
]

// Modules admin page — tabbed view of native platform pages and federated MF modules
export default function Modules() {
  const { modules, refreshModules } = useSettings()                              // live federation module list from SettingsContext
  const [activeTab, setActiveTab]   = useState<TabKey>('native')                // which tab is visible; defaults to native
  const [modal, setModal]           = useState<ModalState>(null)                // add/edit modal discriminant (null = closed)
  const [error, setError]           = useState<string | null>(null)             // last API error message to surface in ErrorBanner
  const [discovered, setDiscovered] = useState<DiscoveredModule[] | null>(null) // registry scan results; null = panel hidden
  const [scanning, setScanning]     = useState(false)                           // true while the scan API call is in flight
  const [logsModule, setLogsModule] = useState<ModuleConfig | null>(null)       // module whose logs drawer is open

  const { data: nativePages = [], refetch: refetchPages } = useGet<PageConfig[]>(
    ['pages'],
    () => pagesService.listPages(),  // GET /api/pages — returns all page_registry rows ordered by route
  )

  async function scanModules() {
    setScanning(true)
    try { setDiscovered(await settingsService.discoverModules()) }  // fetch candidates from MODULE_REGISTRY_URLS
    finally { setScanning(false) }                                  // always clear the spinner, even on error
  }

  async function handleSave(data: Omit<ModuleConfig, 'id'>) {
    try {
      if (modal === 'add' || (modal !== null && typeof modal === 'object' && 'prefill' in modal)) {
        await settingsService.createModule(data)                                 // create from blank form or pre-filled manifest data
      } else if (modal !== null && typeof modal === 'object' && 'id' in modal) {
        await settingsService.updateModule(modal.id, data)                      // update an existing module; modal.id is the DB uuid
      }
      await refreshModules()  // re-fetch so SettingsContext reflects the new state immediately
      setModal(null)
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this module?')) return                                  // native confirm blocks UX until the user decides
    try {
      await settingsService.deleteModule(id)
      await refreshModules()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle(m: ModuleConfig) {
    try {
      await settingsService.updateModule(m.id, { ...m, enabled: !m.enabled })  // PUT requires all fields; spread preserves the rest
      await refreshModules()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handlePageToggle(page: PageConfig) {
    try {
      await pagesService.patchPageConfig(page.route, { enabled: !page.enabled })  // PATCH so only enabled changes
      await refetchPages()  // invalidate the useGet cache so the toggle reflects immediately
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleEnableDiscovered(d: DiscoveredModule) {
    if (!d.module_id) return                                                     // guard: already_registered must have a module_id set
    try {
      const existing = modules.find(m => m.id === d.module_id)
      if (!existing) return  // bail if SettingsContext hasn't loaded the module yet
      await settingsService.updateModule(d.module_id, { ...existing, enabled: true })  // re-enable without changing any other fields
      await refreshModules()
      setDiscovered(prev => prev ? prev.map(x => x.source_url === d.source_url ? { ...x, enabled: true } : x) : prev)  // optimistic panel update so the Enable button disappears immediately
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle>Modules</PageTitle>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-700">
          <Tabs
            tabs={TABS}
            active={activeTab}
            onChange={key => { setActiveTab(key as TabKey); setError(null) }}  // clear error when switching tabs so stale messages don't bleed across
          />
        </div>

        <div className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          {activeTab === 'native' && (
            <NativePagesTab pages={nativePages} onToggle={handlePageToggle} />
          )}

          {activeTab === 'federation' && (
            <FederationTab
              modules={modules}
              discovered={discovered}
              scanning={scanning}
              onAdd={() => setModal('add')}
              onEdit={m => setModal(m)}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onLogs={m => setLogsModule(m)}
              onScan={scanModules}
              onClearDiscovered={() => setDiscovered(null)}
              onEnableDiscovered={handleEnableDiscovered}
              onAddDiscovered={prefill => setModal({ prefill })}
            />
          )}
        </div>
      </div>

      {modal && (
        <ModuleModal
          initial={modal === 'add' ? undefined : 'prefill' in modal ? modal.prefill : modal}
          moduleId={modal !== 'add' && typeof modal === 'object' && 'id' in modal ? modal.id : undefined}
          title={modal !== 'add' && typeof modal === 'object' && 'prefill' in modal ? 'Add module' : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {logsModule && (
        <ModuleLogsDrawer module={logsModule} onClose={() => setLogsModule(null)} />
      )}
    </div>
  )
}

// ── Native pages tab ─────────────────────────────────────────────────────────

interface NativePagesTabProps {
  pages: PageConfig[]
  onToggle: (page: PageConfig) => void
}

function NativePagesTab({ pages, onToggle }: NativePagesTabProps) {
  const navigate = useNavigate()

  if (pages.length === 0)
    return <p className="text-sm text-slate-500">No native pages found.</p>  // shown while useGet resolves or if seed was skipped

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <th className="pb-2 pr-4">Page</th>
            <th className="pb-2 pr-4">Route</th>
            <th className="pb-2 pr-4">Component key</th>  {/* router key used to lazy-load the matching page component */}
            <th className="pb-2 pr-4">Roles</th>
            <th className="pb-2 w-px">Enabled</th>
            <th className="pb-2 w-px"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {pages.map(page => (
            <tr key={page.id}>
              <td className="py-2 pr-4 font-medium text-slate-800 dark:text-white">
                {page.title}
              </td>
              <td className="py-2 pr-4 font-mono text-slate-500 dark:text-slate-400">
                /{page.route || ''}  {/* dashboard route is the empty string — prefix slash makes it readable */}
              </td>
              <td className="py-2 pr-4 font-mono text-slate-500 dark:text-slate-400">
                {page.component_key ?? '—'}  {/* null for federation pages that don't use a component_key */}
              </td>
              <td className="py-2 pr-4">
                <div className="flex gap-1 flex-wrap">
                  {page.roles.map(r => (
                    <Badge key={r} variant="neutral">{r}</Badge>  // one badge per role; neutral colour avoids semantic noise
                  ))}
                </div>
              </td>
              <td className="py-2 w-px">
                <Toggle checked={page.enabled} onChange={() => onToggle(page)} />  {/* calls PATCH /api/pages/config to flip enabled */}
              </td>
              <td className="py-2 w-px">
                <Btn variant="secondary" onClick={() => navigate(`/${page.route}`)}>▶</Btn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Federation tab ───────────────────────────────────────────────────────────

interface FederationTabProps {
  modules: ModuleConfig[]
  discovered: DiscoveredModule[] | null
  scanning: boolean
  onAdd: () => void
  onEdit: (m: ModuleConfig) => void
  onDelete: (id: string) => void
  onToggle: (m: ModuleConfig) => void
  onLogs: (m: ModuleConfig) => void
  onScan: () => void
  onClearDiscovered: () => void
  onEnableDiscovered: (d: DiscoveredModule) => void
  onAddDiscovered: (prefill: Omit<ModuleConfig, 'id'>) => void
}

function FederationTab({
  modules, discovered, scanning,
  onAdd, onEdit, onDelete, onToggle, onLogs,
  onScan, onClearDiscovered, onEnableDiscovered, onAddDiscovered,
}: FederationTabProps) {
  const navigate = useNavigate()

  return (
    <>
      {modules.length === 0 ? (
        <p className="text-sm text-slate-500">No federation modules configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 pr-4">Module</th>
                <th className="pb-2 pr-4">Root slug</th>
                <th className="pb-2 pr-4">Scope</th>
                <th className="pb-2 pr-4">Roles</th>
                <th className="pb-2 pr-4 w-px">Enabled</th>
                <th className="pb-2 w-px"></th>
                <th className="pb-2 w-px"></th>
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
                    <div className="flex gap-1 flex-wrap">
                      {m.roles.map(r => (
                        <Badge key={r} variant="neutral">{r}</Badge>  // one badge per role
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-4 w-px">
                    <Toggle checked={m.enabled} onChange={() => onToggle(m)} />
                  </td>
                      <td className="py-2 w-px whitespace-nowrap">
                    <div className="flex gap-2">
                      <Btn variant="secondary" onClick={() => onLogs(m)}>Logs</Btn>
                      <Btn variant="secondary" onClick={() => onEdit(m)}>Edit</Btn>
                      <Btn variant="danger"    onClick={() => onDelete(m.id)}>Delete</Btn>
                    </div>
                  </td>
                  <td className="py-2 w-px">
                    {m.route && (
                      <Btn variant="secondary" onClick={() => navigate(`/modules/${m.id}`)}>▶</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Btn onClick={onAdd}>+ Add module</Btn>
        <Btn variant="secondary" disabled={scanning} onClick={onScan}>
          {scanning ? 'Scanning…' : '🔍 Scan for modules'}
        </Btn>
      </div>

      {discovered !== null && (  // panel only appears after at least one scan; null hides it entirely
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Discovered modules</h3>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={onClearDiscovered}  // reset to null so the panel disappears until the next scan
            >
              ✕ Clear
            </button>
          </div>
          {discovered.length === 0 ? (
            <p className="text-sm text-slate-500">No modules found. Check MODULE_REGISTRY_URLS on the backend.</p>
          ) : (
            discovered.map(d => (
              <div
                key={d.source_url}  // source_url is stable and unique per registry entry
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
                  <Badge variant="success">Registered</Badge>  // already in DB and active — nothing to do
                ) : d.already_registered && !d.enabled ? (
                  <Btn onClick={() => onEnableDiscovered(d)}>Enable</Btn>  // in DB but disabled — allow one-click re-enable
                ) : (
                  <Btn
                    onClick={() =>
                      onAddDiscovered({  // pre-fill the Add modal from manifest data; admin adjusts remote_url for env-specific URLs
                        name:        d.name        ?? '',
                        description: d.description ?? '',
                        remote_url:  d.remote_url  ?? '',
                        scope:       d.scope       ?? '',
                        component:   d.component   ?? './App',  // MF container protocol default — matches webpack.config.js exposes entry
                        route:       d.route       ?? '',
                        icon:        d.icon        ?? '🧩',
                        enabled:     true,  // new modules default to enabled so they appear in the sidebar immediately
                        roles:       d.roles       ?? ['user', 'admin'],  // fall back to both roles when manifest omits them
                        presets:     { i18n: {}, layout: {}, settings: {} },  // empty presets; populated from manifest on save
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
    </>
  )
}
