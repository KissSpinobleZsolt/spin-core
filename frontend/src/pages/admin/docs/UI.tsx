import { useState } from 'react'
import { PageTitle } from '../../../components/ui/PageTitle'
import { Input } from '../../../components/ui/Input'

interface Prop {
  name: string
  type: string
  default?: string
  required?: true
  description: string
}

interface ComponentDoc {
  name: string
  export: string
  file: string
  description: string
  props: Prop[]
  notes?: string
}

const DOCS: ComponentDoc[] = [
  {
    name: 'Button',
    export: 'Btn',
    file: 'components/ui/Button.tsx',
    description: 'Styled button with three semantic variants. Forwards all native <button> attributes.',
    props: [
      { name: 'variant',   type: "'primary' | 'secondary' | 'danger'", default: "'primary'", description: 'Visual style of the button.' },
      { name: 'className', type: 'string', default: "''", description: 'Extra Tailwind classes merged onto the button element.' },
      { name: '...rest',   type: 'React.ButtonHTMLAttributes<HTMLButtonElement>', description: 'All standard button attributes (onClick, disabled, type, …).' },
    ],
  },
  {
    name: 'Card',
    export: 'Card',
    file: 'components/ui/Card.tsx',
    description: 'White / dark rounded container with border and p-6 padding. Use as a layout block.',
    props: [
      { name: 'children',  type: 'ReactNode', required: true, description: 'Content rendered inside the card.' },
      { name: 'className', type: 'string', description: 'Extra Tailwind classes appended to the wrapper div.' },
    ],
  },
  {
    name: 'ErrorBanner',
    export: 'ErrorBanner',
    file: 'components/ui/ErrorBanner.tsx',
    description: 'Full-width red-tinted alert paragraph. Renders nothing when message is empty.',
    props: [
      { name: 'message', type: 'string', required: true, description: 'Error text to display.' },
    ],
  },
  {
    name: 'Input',
    export: 'Input',
    file: 'components/ui/Input.tsx',
    description: 'Styled text input, optionally wrapped in a labelled group. Forwards all native <input> attributes.',
    props: [
      { name: 'label',     type: 'string', description: "When provided, wraps the input in a <div> with a <label> above it." },
      { name: 'id',        type: 'string', description: "Used to link the label's htmlFor when label is set." },
      { name: 'className', type: 'string', description: 'Extra Tailwind classes on the <input> element.' },
      { name: '...rest',   type: 'React.InputHTMLAttributes<HTMLInputElement>', description: 'All standard input attributes (value, onChange, placeholder, disabled, …).' },
    ],
  },
  {
    name: 'Label',
    export: 'Label',
    file: 'components/ui/Label.tsx',
    description: 'Styled <label> element. Use standalone or alongside Input when manual control is needed.',
    props: [
      { name: '...rest', type: 'React.LabelHTMLAttributes<HTMLLabelElement>', description: 'All standard label attributes (htmlFor, children, …).' },
    ],
  },
  {
    name: 'Modal',
    export: 'Modal',
    file: 'components/ui/Modal.tsx',
    description: 'Fixed full-screen overlay with a scrollable inner panel (max-height 90 vh). Mount/unmount to show/hide.',
    props: [
      { name: 'title',    type: 'string',    required: true, description: 'Heading text shown in the modal header.' },
      { name: 'onClose',  type: '() => void', description: 'When provided, an × button is rendered in the header.' },
      { name: 'maxWidth', type: 'string', default: "'max-w-lg'", description: 'Tailwind max-width class controlling the dialog width.' },
      { name: 'children', type: 'ReactNode', required: true, description: 'Content rendered inside the modal body.' },
    ],
  },
  {
    name: 'PageTitle',
    export: 'PageTitle',
    file: 'components/ui/PageTitle.tsx',
    description: 'Bold h1 heading sized at text-xl. Use once at the top of each page.',
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'Title text or elements.' },
    ],
  },
  {
    name: 'Spinner',
    export: 'Spinner',
    file: 'components/ui/Spinner.tsx',
    description: 'Animated inline loading indicator with three size presets.',
    props: [
      { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'sm = 16 px, md = 24 px, lg = 32 px ring.' },
    ],
  },
  {
    name: 'Toggle',
    export: 'Toggle',
    file: 'components/ui/Toggle.tsx',
    description: 'Pill-shaped accessible switch with a sliding knob. Uses role="switch" and aria-checked.',
    props: [
      { name: 'checked',  type: 'boolean',              required: true, description: 'Controlled checked state.' },
      { name: 'onChange', type: '(v: boolean) => void', required: true, description: 'Called with the new value when the user clicks.' },
      { name: 'disabled', type: 'boolean', description: 'When true, interaction is blocked and the knob is greyed out.' },
    ],
  },
  {
    name: 'Badge',
    export: 'Badge',
    file: 'components/ui/Badge.tsx',
    description: 'Colour-coded rounded label for status, severity, or category tags.',
    props: [
      { name: 'variant',  type: "'info' | 'success' | 'warn' | 'error' | 'neutral'", default: "'neutral'", description: 'Colour scheme of the badge.' },
      { name: 'dot',      type: 'boolean', description: 'When true, prepends a small filled circle matching the variant colour.' },
      { name: 'children', type: 'ReactNode', required: true, description: 'Badge text or content.' },
    ],
  },
  {
    name: 'StatCard',
    export: 'StatCard',
    file: 'components/ui/StatCard.tsx',
    description: 'KPI tile displaying a large metric value, a label, and an optional sub-text. Use in a grid row.',
    props: [
      { name: 'value', type: 'string | number', required: true, description: 'Primary metric value displayed large.' },
      { name: 'label', type: 'string',          required: true, description: 'Short descriptor shown below the value in uppercase.' },
      { name: 'sub',   type: 'string', description: 'Secondary detail line shown below the label in muted text.' },
    ],
  },
  {
    name: 'Tabs',
    export: 'Tabs',
    file: 'components/ui/Tabs.tsx',
    description: 'Horizontal tab bar with an active underline indicator. Fully controlled — caller manages active state.',
    props: [
      { name: 'tabs',     type: 'Array<{ key: string; label: string }>', required: true, description: 'Tab definitions in display order.' },
      { name: 'active',   type: 'string', required: true, description: 'The key of the currently active tab.' },
      { name: 'onChange', type: '(key: string) => void', required: true, description: "Called with the clicked tab's key." },
    ],
  },
  {
    name: 'ProgressBar',
    export: 'ProgressBar',
    file: 'components/ui/ProgressBar.tsx',
    description: 'Thin linear progress indicator. Value is clamped to 0–100.',
    props: [
      { name: 'value', type: 'number', required: true, description: 'Fill percentage (0–100).' },
      { name: 'label', type: 'string', description: 'When provided, renders a row above the bar with the label left and percentage right.' },
      { name: 'color', type: "'blue' | 'green' | 'amber' | 'red'", default: "'blue'", description: 'Fill colour of the progress bar.' },
    ],
  },
  {
    name: 'Chip',
    export: 'Chip',
    file: 'components/ui/Chip.tsx',
    description: 'Small inline tag. Pass onRemove to show a × dismiss button.',
    props: [
      { name: 'children', type: 'ReactNode', required: true, description: 'Chip content.' },
      { name: 'onRemove', type: '() => void', description: 'When provided, an × button is rendered that calls this handler.' },
    ],
  },
  {
    name: 'DropZone',
    export: 'DropZone',
    file: 'components/ui/DropZone.tsx',
    description: 'Drag-and-drop file upload area. Also opens a file picker on click.',
    props: [
      { name: 'onFiles', type: '(files: File[]) => void', description: 'Called with the array of dropped or selected files.' },
      { name: 'accept',  type: 'string', description: 'MIME type or extension filter forwarded to the hidden <input type="file">. E.g. "video/*" or ".zip".' },
      { name: 'hint',    type: 'string', description: 'Small helper text shown below the drop prompt (e.g. accepted formats, size limit).' },
      { name: 'file',    type: 'File | null', description: 'When set, replaces the placeholder text with the file name.' },
    ],
    notes: 'DropZone manages its own internal dragging state. The file prop is display-only — keep the actual File object in the parent and pass it back in.',
  },
]

function PropTable({ props }: { props: Prop[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            {['Prop', 'Type', 'Default', 'Description'].map(h => (
              <th key={h} className="text-left pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {props.map(p => (
            <tr key={p.name}>
              <td className="py-2 pr-4 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {p.name}{p.required && <span className="ml-1 text-red-500">*</span>}
              </td>
              <td className="py-2 pr-4 font-mono text-slate-600 dark:text-slate-300 max-w-[200px]">{p.type}</td>
              <td className="py-2 pr-4 font-mono text-slate-400 whitespace-nowrap">{p.default ?? '—'}</td>
              <td className="py-2 text-slate-600 dark:text-slate-300 leading-relaxed">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ComponentCard({ doc }: { doc: ComponentDoc }) {
  return (
    <div id={doc.name.toLowerCase()} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">{doc.name}</h2>
            {doc.export !== doc.name && (
              <code className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                {`{ ${doc.export} }`}
              </code>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{doc.description}</p>
        </div>
        <code className="text-[11px] bg-slate-100 dark:bg-slate-900 text-slate-500 px-2 py-1 rounded shrink-0 whitespace-nowrap">
          {doc.file}
        </code>
      </div>
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
        <code className="text-xs text-slate-500 dark:text-slate-400">
          import {'{ '}<span className="text-blue-600 dark:text-blue-400">{doc.export}</span>{' }'} from{' '}
          <span className="text-green-600 dark:text-green-400">'../../{doc.file.replace('.tsx', '')}'</span>
        </code>
      </div>
      <div className="px-5 py-4 bg-white dark:bg-slate-800">
        {doc.props.length > 0 ? <PropTable props={doc.props} /> : <p className="text-xs text-slate-400">No props.</p>}
        {doc.notes && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            ℹ️ {doc.notes}
          </p>
        )}
      </div>
    </div>
  )
}

export default function DocsUI() {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? DOCS.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.description.toLowerCase().includes(query.toLowerCase()),
      )
    : DOCS

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <PageTitle>UI Components</PageTitle>
          <p className="text-sm text-slate-500 mt-1">
            {DOCS.length} components · <span className="text-red-500">*</span> required prop
          </p>
        </div>
        <div className="w-64">
          <Input placeholder="Search components…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      {!query && (
        <div className="flex flex-wrap gap-2">
          {DOCS.map(d => (
            <a
              key={d.name}
              href={`#${d.name.toLowerCase()}`}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              {d.name}
            </a>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12">No components match "{query}"</p>
      ) : (
        <div className="space-y-5">
          {filtered.map(doc => <ComponentCard key={doc.name} doc={doc} />)}
        </div>
      )}
    </div>
  )
}
