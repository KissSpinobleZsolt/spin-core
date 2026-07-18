import { useState } from 'react'
import { settingsService, type ModulePresets } from '@services'
import { Btn } from '@components/ui/button'

// Collapsible panel showing the stored i18n snapshot for a module with a reset action
export function I18nSnapshotSection({ moduleId, presets }: { moduleId: string; presets: ModulePresets }) {
  const [open, setOpen]           = useState(false)                                       // controls collapsed/expanded state
  const [resetting, setResetting] = useState(false)                                       // true while the reset API call is in flight
  const [resetStatus, setResetStatus] = useState<{ ok: boolean; message: string } | null>(null) // result of the last reset attempt
  const hasI18n = Object.keys(presets.i18n).length > 0                                   // whether the snapshot contains any language keys

  async function handleReset() {
    setResetting(true)
    setResetStatus(null)                                                                   // clear previous feedback before retrying
    try {
      await settingsService.resetModuleI18n(moduleId)                                     // re-merge i18n from the module's manifest
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
        onClick={() => setOpen(o => !o)} // toggle the snapshot preview
        className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        {open ? '▲' : '▼'} i18n snapshot {hasI18n ? `(${Object.keys(presets.i18n).length} language(s))` : '(empty)'}
      </button>
      {open && (
        <pre className="text-xs bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3 overflow-auto max-h-40 text-slate-600 dark:text-slate-300">
          {hasI18n
            ? JSON.stringify(presets.i18n, null, 2) // pretty-print the stored snapshot
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
