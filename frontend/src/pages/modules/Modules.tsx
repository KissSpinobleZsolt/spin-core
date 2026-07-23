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
import { Table } from '@components/ui/Table'
import type { ModalState } from './ModalState.type'
import { ModuleModal } from './ModuleModal'

type TabKey = 'native' | 'federation'

// Static tab definitions — labels displayed by the Tabs component
const TABS = [
  { key: 'federation', label: 'Federation' },   // Webpack Module Federation remote modules
  { key: 'native',     label: 'Native pages' }, // platform pages seeded from page_registry at startup
]

// Modules admin page — tabbed view of native platform pages and federated MF modules
export default function Modules() {
  const { modules, refreshModules } = useSettings()                               // live federation module list from SettingsContext
  const [activeTab, setActiveTab]       = useState<TabKey>('federation')          // which tab is visible
  const [modal, setModal]               = useState<ModalState>(null)              // add modal discriminant (null = closed)
  const [error, setError]               = useState<string | null>(null)           // last API error message to surface in ErrorBanner
  const [discovered, setDiscovered]     = useState<DiscoveredModule[] | null>(null) // registry scan results; null = panel hidden
  const [scanning, setScanning]         = useState(false)                         // true while the scan API call is in flight
  const [addingDiscoveredUrl, setAddingDiscoveredUrl] = useState<string | null>(null) // source_url currently being auto-registered

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
        const result = await settingsService.createModule(data) as ModuleConfig & { manifest_warning?: string | null }
        // Surface a warning when the backend could not reach the manifest (i18n not seeded)
        if (result.manifest_warning) {
          setError(`Module saved, but manifest fetch failed — i18n was not seeded. (${result.manifest_warning})`)
        }
      } else if (modal !== null && typeof modal === 'object' && 'id' in modal) {
        await settingsService.updateModule(modal.id, data)  // update an existing module; modal.id is the DB uuid
      }
      await refreshModules()
      setModal(null)
    } catch (err) {
      setError(String(err))
    }
  }

  /** Fetch manifest from the browser and directly register the module as inactive — no modal confirmation step. */
  async function handleAddDiscovered(d: DiscoveredModule) {
    setAddingDiscoveredUrl(d.source_url)
    setError(null)
    try {
      // Derive manifest URL from remote_url (browser-accessible localhost:PORT), not source_url (Docker-internal hostname).
      const manifestBase = d.remote_url?.replace(/\/remoteEntry\.js$/, '').replace(/\/$/, '')
      const manifestUrl = manifestBase ? `${manifestBase}/manifest.json` : null

      let manifest: Record<string, unknown> | null = null
      if (manifestUrl) {
        try {
          const res = await fetch(manifestUrl)  // browser fetch where localhost is the host machine
          if (res.ok) manifest = await res.json() as Record<string, unknown>
        } catch {
          // manifest unreachable in browser — backend will try its own fetch using remote_url
        }
      }

      const result = await settingsService.createModule({
        name:        d.name        ?? '',
        description: d.description ?? '',
        remote_url:  d.remote_url  ?? '',
        scope:       d.scope       ?? '',
        component:   d.component   ?? './App',
        route:       d.route       ?? '',
        icon:        d.icon        ?? '🧩',
        enabled:     false,                         // registered as inactive; admin enables via the toggle
        roles:       d.roles       ?? ['user', 'admin'],
        presets:     { i18n: {}, layout: {}, settings: {} },
        configuration_raw: manifest,               // forward the full manifest snapshot to the backend
      }) as ModuleConfig & { manifest_warning?: string | null }

      await refreshModules()
      // Optimistically mark as already_registered so the Add button disappears
      setDiscovered(prev => prev ? prev.map(x =>
        x.source_url === d.source_url ? { ...x, already_registered: true, module_id: result.id, enabled: false } : x
      ) : prev)

      if (result.manifest_warning) {
        setError(`Module registered (inactive). Manifest warning: ${result.manifest_warning}`)
      } else {
        setError(`✓ "${result.name}" registered as inactive.`)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setAddingDiscoveredUrl(null)
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
      await refetchPages()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleEnableDiscovered(d: DiscoveredModule) {
    if (!d.module_id) return  // guard: already_registered must have a module_id set
    try {
      const existing = modules.find(m => m.id === d.module_id)
      if (!existing) return
      await settingsService.updateModule(d.module_id, { ...existing, enabled: true })
      await refreshModules()
      setDiscovered(prev => prev ? prev.map(x =>
        x.source_url === d.source_url ? { ...x, enabled: true } : x
      ) : prev)  // optimistic panel update so the Enable button disappears immediately
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
            onChange={key => { setActiveTab(key as TabKey); setError(null) }}  // clear error when switching tabs
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
              addingDiscoveredUrl={addingDiscoveredUrl}
              onAdd={() => setModal('add')}
              onToggle={handleToggle}
              onScan={scanModules}
              onClearDiscovered={() => setDiscovered(null)}
              onEnableDiscovered={handleEnableDiscovered}
              onAddDiscovered={handleAddDiscovered}
            />
          )}
        </div>
      </div>

      {modal === 'add' && (
        <ModuleModal
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Native pages tab ──────────────────────────────────────────────────────────

interface NativePagesTabProps {
  pages: PageConfig[]
  onToggle: (page: PageConfig) => void
}

function NativePagesTab({ pages, onToggle }: NativePagesTabProps) {
  const navigate = useNavigate()

  return (
    <Table<PageConfig>
      rows={pages}
      rowKey={page => page.id}
      empty={<p className="text-sm text-slate-500">No native pages found.</p>}
      columns={[
        {
          key: 'page',
          header: 'Page',
          className: 'font-medium text-slate-800 dark:text-white',
          cell: page => page.title,
        },
        {
          key: 'route',
          header: 'Route',
          className: 'font-mono text-slate-500 dark:text-slate-400',
          cell: page => `/${page.route || ''}`,  // dashboard route is the empty string — prefix slash makes it readable
        },
        {
          key: 'component_key',
          header: 'Component key',
          className: 'font-mono text-slate-500 dark:text-slate-400',
          cell: page => page.component_key ?? '—',  // null for federation pages
        },
        {
          key: 'roles',
          header: 'Roles',
          cell: page => (
            <div className="flex gap-1 flex-wrap">
              {page.roles.map(r => (
                <Badge key={r} variant="neutral">{r}</Badge>
              ))}
            </div>
          ),
        },
        {
          key: 'enabled',
          header: 'Enabled',
          headerClassName: 'w-px',
          className: 'w-px',
          cell: page => <Toggle checked={page.enabled} onChange={() => onToggle(page)} />,
        },
        {
          key: 'navigate',
          headerClassName: 'w-px',
          className: 'w-px',
          cell: page => <Btn variant="secondary" onClick={() => navigate(`/${page.route}`)}>▶</Btn>,
        },
      ]}
    />
  )
}

// ── Federation tab ────────────────────────────────────────────────────────────

interface FederationTabProps {
  modules: ModuleConfig[]
  discovered: DiscoveredModule[] | null
  scanning: boolean
  addingDiscoveredUrl: string | null
  onAdd: () => void
  onToggle: (m: ModuleConfig) => void
  onScan: () => void
  onClearDiscovered: () => void
  onEnableDiscovered: (d: DiscoveredModule) => void
  onAddDiscovered: (d: DiscoveredModule) => Promise<void>
}

function FederationTab({
  modules, discovered, scanning, addingDiscoveredUrl,
  onAdd, onToggle, onScan, onClearDiscovered, onEnableDiscovered, onAddDiscovered,
}: FederationTabProps) {
  const navigate = useNavigate()

  return (
    <>
      <Table<ModuleConfig>
        rows={modules}
        rowKey={m => m.id}
        empty={<p className="text-sm text-slate-500">No federation modules configured yet.</p>}
        columns={[
          {
            key: 'scope',
            header: 'Scope',
            cell: m => (
              <>
                <span className="mr-2">{m.icon}</span>
                <span className="font-medium text-slate-800 dark:text-white">{m.name}</span>
                <p className="font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">{m.scope}</p>
              </>
            ),
          },
          {
            key: 'roles',
            header: 'Roles',
            cell: m => (
              <div className="flex gap-1 flex-wrap">
                {m.roles.map(r => (
                  <Badge key={r} variant="neutral">{r}</Badge>
                ))}
              </div>
            ),
          },
          {
            key: 'enabled',
            header: 'Enabled',
            headerClassName: 'w-px',
            className: 'w-px',
            cell: m => <Toggle checked={m.enabled} onChange={() => onToggle(m)} />,
          },
          {
            key: 'actions',
            headerClassName: 'w-px',
            className: 'w-px whitespace-nowrap',
            cell: m => (
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={() => navigate(`/admin/modules/${m.scope}`)}>Edit</Btn>
                {m.route && (
                  <Btn variant="secondary" onClick={() => navigate(`/modules/${m.id}`)}>▶</Btn>
                )}
              </div>
            ),
          },
        ]}
      />

      <div className="flex gap-2 flex-wrap">
        <Btn onClick={onAdd}>+ Add module</Btn>
        <Btn variant="secondary" disabled={scanning} onClick={onScan}>
          {scanning ? 'Scanning…' : '🔍 Scan for modules'}
        </Btn>
      </div>

      {discovered !== null && (  // panel only appears after at least one scan
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Discovered modules</h3>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={onClearDiscovered}
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
                  <div className="flex gap-2 items-center">
                    <Badge variant="neutral">Inactive</Badge>
                    <Btn onClick={() => onEnableDiscovered(d)}>Enable</Btn> 
                  </div>
                ) : (
                  // Clicking Add fetches the manifest in the browser and registers the module as inactive
                  <Btn
                    disabled={addingDiscoveredUrl === d.source_url}
                    onClick={() => onAddDiscovered(d)}
                  >
                    {addingDiscoveredUrl === d.source_url ? '…' : 'Add'}
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
