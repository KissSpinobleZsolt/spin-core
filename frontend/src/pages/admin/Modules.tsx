import { useEffect, useState } from 'react'
import { settingsService, type ModuleConfig, type DiscoveredModule, type ModulePresets } from '../../services/settingsService'
import {
  logsService,
  type ModuleLogEntry,
  type ModuleLogSummaryEntry,
  type ModuleLogsParams,
} from '../../services/logsService'
import { useSettings } from '../../context/SettingsContext'
import TimeRangeFilter, { defaultTimeRange, type TimeRange } from '../../components/TimeRangeFilter'
import { Btn } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Modal } from '../../components/ui/Modal'
import { Toggle } from '../../components/ui/Toggle'
import { StatCard } from '../../components/ui/StatCard'
import { Spinner } from '../../components/ui/Spinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { PageTitle } from '../../components/ui/PageTitle'

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm resize-y"
    />
  )
}

const BLANK: Omit<ModuleConfig, 'id'> = {
  name: '',
  description: '',
  remote_url: '',
  scope: '',
  component: './App',
  route: '',
  icon: '🧩',
  enabled: true,
  roles: ['user', 'admin'],
  presets: { i18n: {}, layout: {}, settings: {} },
}

type ModalState = 'add' | ModuleConfig | { prefill: Omit<ModuleConfig, 'id'> } | null

function I18nSnapshotSection({ moduleId, presets }: { moduleId: string; presets: ModulePresets }) {
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetStatus, setResetStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const hasI18n = Object.keys(presets.i18n).length > 0

  async function handleReset() {
    setResetting(true)
    setResetStatus(null)
    try {
      await settingsService.resetModuleI18n(moduleId)
      setResetStatus({ ok: true, message: 'i18n re-merged successfully' })
    } catch {
      setResetStatus({ ok: false, message: 'Failed to reset i18n' })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        {open ? '▲' : '▼'} i18n snapshot {hasI18n ? `(${Object.keys(presets.i18n).length} language(s))` : '(empty)'}
      </button>
      {open && (
        <pre className="text-xs bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3 overflow-auto max-h-40 text-slate-600 dark:text-slate-300">
          {hasI18n
            ? JSON.stringify(presets.i18n, null, 2)
            : 'No snapshot — delete and re-register this module to populate from its manifest.'}
        </pre>
      )}
      <div className="flex items-center gap-3">
        <Btn variant="secondary" disabled={!hasI18n || resetting} onClick={handleReset}>
          {resetting ? '…' : '↺ Reset i18n to defaults'}
        </Btn>
        {resetStatus && (
          <span className={`text-xs ${resetStatus.ok ? 'text-emerald-500' : 'text-red-500'}`}>
            {resetStatus.message}
          </span>
        )}
      </div>
    </div>
  )
}

function ModuleModal({
  initial,
  moduleId,
  title,
  onSave,
  onClose,
}: {
  initial?: Omit<ModuleConfig, 'id'>
  moduleId?: string
  title?: string
  onSave: (m: Omit<ModuleConfig, 'id'>) => void
  onClose: () => void
}) {
  const base = initial ? { ...BLANK, ...initial } : { ...BLANK }
  const [form, setForm] = useState<Omit<ModuleConfig, 'id'>>(base)
  const [previewI18n, setPreviewI18n] = useState<Record<string, unknown> | null>(null)
  const [manifestLoading, setManifestLoading] = useState(false)
  const [manifestStatus, setManifestStatus] = useState<{ ok: boolean; message: string } | null>(null)

  const valid =
    form.name.trim().length > 0 &&
    form.remote_url.startsWith('http') &&
    form.scope.trim().length > 0 &&
    form.route.trim().length > 0

  async function loadManifest() {
    setManifestLoading(true)
    setManifestStatus(null)
    setPreviewI18n(null)
    try {
      const base = form.remote_url.replace(/\/remoteEntry\.js$/, '').replace(/\/$/, '')
      const resp = await fetch(`${base}/manifest.json`)
      if (!resp.ok) throw new Error(`${resp.status}`)
      const manifest = await resp.json() as Record<string, unknown>
      setForm(f => ({
        ...f,
        name: (manifest.name as string) || f.name,
        description: (manifest.description as string) || f.description,
        scope: (manifest.scope as string) || f.scope,
        component: (manifest.component as string) || f.component,
        route: (manifest.route as string) || f.route,
        icon: (manifest.icon as string) || f.icon,
        roles: (manifest.roles as string[]) || f.roles,
      }))
      const remoteEntry = (manifest.remote_entry as string) || (manifest.remote_url as string)
      if (remoteEntry) setForm(f => ({ ...f, remote_url: remoteEntry }))
      const bots = (manifest.bots as unknown[]) ?? []
      const i18n = (manifest.i18n as Record<string, unknown>) ?? {}
      const i18nLangs = Object.keys(i18n).length
      if (i18nLangs > 0) setPreviewI18n(i18n)
      const parts = [`${bots.length} bot${bots.length !== 1 ? 's' : ''}`]
      if (i18nLangs > 0) parts.push(`${i18nLangs} i18n language(s)`)
      setManifestStatus({ ok: true, message: `Loaded — ${parts.join(', ')} will be provisioned on save` })
    } catch {
      setManifestStatus({ ok: false, message: 'Could not fetch manifest.json from the given URL' })
    } finally {
      setManifestLoading(false)
    }
  }

  return (
    <Modal title={title ?? (initial ? 'Edit module' : 'Add module')} onClose={onClose}>
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
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={v => setForm(f => ({ ...f, description: v }))}
          placeholder="Brief description of what this module does"
          rows={2}
        />
      </div>

      <div>
        <Label>Remote entry URL</Label>
        <div className="flex gap-2">
          <Input value={form.remote_url} onChange={e => setForm(f => ({ ...f, remote_url: e.target.value }))} placeholder="http://host/remoteEntry.js" />
          <Btn
            variant="secondary"
            disabled={!form.remote_url.startsWith('http') || manifestLoading}
            onClick={loadManifest}
          >
            {manifestLoading ? '…' : 'Load manifest'}
          </Btn>
        </div>
        {manifestStatus && (
          <p className={`text-xs mt-1 ${manifestStatus.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {manifestStatus.message}
          </p>
        )}
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
        <Label>Root slug</Label>
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

      {/* Creating: show i18n preview from manifest load */}
      {!moduleId && previewI18n && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          i18n: {Object.keys(previewI18n).length} language(s) will be loaded from manifest on save
        </p>
      )}

      {/* Editing: show stored i18n snapshot with reset button */}
      {moduleId && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          <I18nSnapshotSection moduleId={moduleId} presets={form.presets} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => onSave({ ...form })} disabled={!valid}>Save</Btn>
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------------ //
// Shared log helpers
// ------------------------------------------------------------------ //

const LEVEL_VARIANT: Record<string, 'info' | 'warn' | 'error'> = {
  INFO: 'info', WARN: 'warn', ERROR: 'error',
}

function LevelBadge({ level }: { level: string }) {
  return <Badge variant={LEVEL_VARIANT[level] ?? 'info'}>{level || 'INFO'}</Badge>
}

// ------------------------------------------------------------------ //
// Module logs drawer
// ------------------------------------------------------------------ //

const PAGE_SIZE = 50

function ModuleLogsDrawer({ module: mod, onClose }: { module: ModuleConfig; onClose: () => void }) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange())
  const [summary, setSummary] = useState<ModuleLogSummaryEntry[]>([])
  const [logs, setLogs] = useState<ModuleLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const params: ModuleLogsParams = {
    from: timeRange.from ? new Date(timeRange.from).toISOString() : undefined,
    to: timeRange.to ? new Date(timeRange.to).toISOString() : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      logsService.getModuleLogsSummary(mod.id, { from: params.from, to: params.to }),
      logsService.getModuleLogs(mod.id, params),
    ])
      .then(([s, l]) => {
        setSummary(s.items)
        setLogs(l.items)
        setTotal(l.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mod.id, timeRange, page])

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
              {mod.icon && <span className="mr-2">{mod.icon}</span>}{mod.name} — Logs
            </p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{mod.scope}</p>
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

// ------------------------------------------------------------------ //
// Main page
// ------------------------------------------------------------------ //

export default function Modules() {
  const { modules, refreshModules } = useSettings()
  const [modal, setModal] = useState<ModalState>(null)
  const [error, setError] = useState<string | null>(null)
  const [discovered, setDiscovered] = useState<DiscoveredModule[] | null>(null)
  const [scanning, setScanning] = useState(false)
  const [logsModule, setLogsModule] = useState<ModuleConfig | null>(null)

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

  async function handleEnableDiscovered(d: DiscoveredModule) {
    if (!d.module_id) return
    try {
      // Must spread the full ModuleConfig — the PUT endpoint requires all fields, not just enabled.
      const existing = modules.find(m => m.id === d.module_id)
      if (!existing) return
      await settingsService.updateModule(d.module_id, { ...existing, enabled: true })
      await refreshModules()
      setDiscovered(prev => prev ? prev.map(x => x.source_url === d.source_url ? { ...x, enabled: true } : x) : prev)
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
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
          <Btn disabled>+ Add module</Btn>
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
                        setModal({
                          prefill: {
                            name: d.name ?? '',
                            description: d.description ?? '',
                            remote_url: d.remote_url ?? '',
                            scope: d.scope ?? '',
                            component: d.component ?? './App',
                            route: d.route ?? '',
                            icon: d.icon ?? '🧩',
                            enabled: true,
                            roles: d.roles ?? ['user', 'admin'],
                            presets: { i18n: {}, layout: {}, settings: {} },
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
