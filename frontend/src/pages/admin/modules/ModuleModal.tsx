import { useState } from 'react'
import { type ModuleConfig, type ModulePresets } from '@services'
import { Label } from '../../../components/ui/Label'
import { Input } from '../../../components/ui/input'
import { Btn } from '../../../components/ui/button'
import { Modal } from '../../../components/ui/modal'
import { BLANK } from './BLANK.constant'
import { I18nSnapshotSection } from './I18nSnapshotSection'
import { Textarea } from './Textarea'

// Modal for adding or editing a module; loads manifest.json to pre-fill fields
export function ModuleModal({
  initial,
  moduleId,
  title,
  onSave,
  onClose,
}: {
  initial?: Omit<ModuleConfig, 'id'>     // pre-fill values when editing or adding from discovery
  moduleId?: string                       // present when editing an existing module (enables i18n section)
  title?: string                          // optional override for the modal heading
  onSave: (m: Omit<ModuleConfig, 'id'>) => void
  onClose: () => void
}) {
  const base = initial ? { ...BLANK, ...initial } : { ...BLANK }                        // merge initial values over BLANK defaults
  const [form, setForm]                   = useState<Omit<ModuleConfig, 'id'>>(base)
  const [previewI18n, setPreviewI18n]     = useState<Record<string, unknown> | null>(null) // i18n preview fetched from manifest
  const [manifestLoading, setManifestLoading] = useState(false)                          // true while fetching manifest.json
  const [manifestStatus, setManifestStatus]   = useState<{ ok: boolean; message: string } | null>(null) // result of the last manifest load

  // All four required fields must be non-empty before the Save button is enabled
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
      const base = form.remote_url.replace(/\/remoteEntry\.js$/, '').replace(/\/$/, '') // strip remoteEntry.js to get the module root
      const resp = await fetch(`${base}/manifest.json`)
      if (!resp.ok) throw new Error(`${resp.status}`)
      const manifest = await resp.json() as Record<string, unknown>
      setForm(f => ({ // apply manifest fields; fall back to current form values if absent
        ...f,
        name:      (manifest.name      as string)   || f.name,
        description: (manifest.description as string) || f.description,
        scope:     (manifest.scope     as string)   || f.scope,
        component: (manifest.component as string)   || f.component,
        route:     (manifest.route     as string)   || f.route,
        icon:      (manifest.icon      as string)   || f.icon,
        roles:     (manifest.roles     as string[]) || f.roles,
      }))
      const remoteEntry = (manifest.remote_entry as string) || (manifest.remote_url as string)
      if (remoteEntry) setForm(f => ({ ...f, remote_url: remoteEntry }))             // prefer manifest-declared entry URL
      const bots    = (manifest.bots as unknown[]) ?? []
      const i18n    = (manifest.i18n as Record<string, unknown>) ?? {}
      const i18nLangs = Object.keys(i18n).length
      if (i18nLangs > 0) setPreviewI18n(i18n)                                        // show i18n preview when languages are present
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
            disabled={!form.remote_url.startsWith('http') || manifestLoading} // disable until a valid URL is entered
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
          <I18nSnapshotSection moduleId={moduleId} presets={form.presets as ModulePresets} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => onSave({ ...form })} disabled={!valid}>Save</Btn>
      </div>
    </Modal>
  )
}
