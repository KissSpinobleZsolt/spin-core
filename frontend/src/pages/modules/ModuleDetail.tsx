import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { settingsService, type ModuleConfig } from '@services'
import { useSettings } from '@context'
import { Btn } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Toggle } from '@components/ui/toggle'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { PageTitle } from '@components/ui/PageTitle'
import { ModuleModal } from './ModuleModal'
import { ModuleLogsDrawer } from './ModuleLogsDrawer'
import { ModuleConfigPanel } from './ModuleConfigPanel'
import type { ModalState } from './ModalState.type'

export default function ModuleDetail() {
  const { scope } = useParams<{ scope: string }>()           // slug from URL — matches module.scope
  const { modules, refreshModules } = useSettings()
  const navigate = useNavigate()

  const module = modules.find(m => m.scope === scope) ?? null  // look up by scope slug

  const [modal, setModal]           = useState<ModalState>(null)
  const [logsOpen, setLogsOpen]     = useState(false)
  const [reseedingId, setReseedingId] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  if (!module) {
    return (
      <div className="space-y-4">
        <Btn variant="secondary" onClick={() => navigate('/admin/modules')}>← Modules</Btn>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Module "{scope}" not found.
        </p>
      </div>
    )
  }

  async function handleSave(data: Omit<ModuleConfig, 'id'>) {
    try {
      await settingsService.updateModule(module!.id, data)
      await refreshModules()
      setModal(null)
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${module!.name}"? This cannot be undone.`)) return
    try {
      await settingsService.deleteModule(module!.id)
      navigate('/admin/modules')  // return to list after deletion
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleToggle() {
    try {
      await settingsService.updateModule(module!.id, { ...module!, enabled: !module!.enabled })
      await refreshModules()
    } catch (err) {
      setError(String(err))
    }
  }

  async function handleReseed(m: ModuleConfig) {
    setReseedingId(m.id)
    setError(null)
    try {
      const { bots_seeded, message } = await settingsService.reseedBots(m.id)
      setError(bots_seeded > 0 ? `✓ ${message}` : `✓ All bots already present (${message})`)
    } catch (err) {
      setError(String(err))
    } finally {
      setReseedingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back + title row */}
      <div className="flex items-center gap-4">
        <Btn variant="secondary" onClick={() => navigate('/admin/modules')}>← Modules</Btn>
        <PageTitle>{module.icon} {module.name}</PageTitle>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Metadata card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            {module.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{module.description}</p>
            )}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm mt-3">
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Scope</dt>
              <dd className="font-mono text-slate-700 dark:text-slate-300">{module.scope}</dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Route</dt>
              <dd className="font-mono text-slate-700 dark:text-slate-300">/modules/{module.route}</dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Remote entry</dt>
              <dd className="font-mono text-slate-600 dark:text-slate-400 text-xs break-all">{module.remote_url}</dd>
              {module.backend_url && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400 font-medium">Backend URL</dt>
                  <dd className="font-mono text-slate-600 dark:text-slate-400 text-xs break-all">{module.backend_url}</dd>
                </>
              )}
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Roles</dt>
              <dd className="flex gap-1 flex-wrap">
                {module.roles.map(r => <Badge key={r} variant="neutral">{r}</Badge>)}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400 font-medium">Enabled</dt>
              <dd><Toggle checked={module.enabled} onChange={handleToggle} /></dd>
            </dl>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap shrink-0">
            {module.route && (
              <Btn variant="secondary" onClick={() => navigate(`/modules/${module.id}`)}>▶ Launch</Btn>
            )}
            <Btn variant="secondary" onClick={() => setLogsOpen(true)}>Logs</Btn>
            <Btn onClick={() => setModal(module)}>Edit</Btn>
            <Btn variant="danger" onClick={handleDelete}>Delete</Btn>
          </div>
        </div>
      </div>

      {/* Manifest / config panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Manifest configuration</h2>
        </div>
        <ModuleConfigPanel module={module} reseedingId={reseedingId} onReseed={handleReseed} />
      </div>

      {modal && typeof modal === 'object' && 'id' in modal && (
        <ModuleModal
          initial={modal}
          moduleId={modal.id}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {logsOpen && (
        <ModuleLogsDrawer module={module} onClose={() => setLogsOpen(false)} />
      )}
    </div>
  )
}
