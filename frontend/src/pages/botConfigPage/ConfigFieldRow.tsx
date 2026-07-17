import { type BotConfigSchemaField } from '@services' // schema field descriptor type
import { Toggle } from '../../components/ui/toggle' // boolean toggle control

export function ConfigFieldRow({ // renders boolean/select/number/password inputs from schema
  field,
  value,
  onChange,
}: {
  field: BotConfigSchemaField
  value: unknown
  onChange: (key: string, v: unknown) => void
}) {
  const current = value !== undefined ? value : field.default // fall back to schema default

  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <span className="text-sm text-slate-700 dark:text-slate-300">{field.label}</span>
        <Toggle checked={Boolean(current)} onChange={(v) => onChange(field.key, v)} />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{field.label}</span>
        <select
          value={String(current)}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="text-sm rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{field.label}</span>
      <input
        type={field.type === 'password' ? 'password' : 'number'}
        value={field.type === 'number' ? Number(current) : String(current)}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) =>
          onChange(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)
        }
        className="w-32 text-sm rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}
