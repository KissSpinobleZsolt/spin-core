import { useState } from 'react'
import { Input } from '../../../components/ui/Input'
import { Btn } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { ErrorBanner } from '../../../components/ui/ErrorBanner'
import { Label } from '../../../components/ui/Label'
import { Modal } from '../../../components/ui/Modal'
import { PageTitle } from '../../../components/ui/PageTitle'
import { Spinner } from '../../../components/ui/spinner'
import { Toggle } from '../../../components/ui/toggle'
import { Badge } from '../../../components/ui/Badge'
import { StatCard } from '../../../components/ui/statCard'
import { Tabs } from '../../../components/ui/tabs'
import { ProgressBar } from '../../../components/ui/progressBar'
import { Chip } from '../../../components/ui/Chip'
import { DropZone } from '../../../components/ui/DropZone'

function PreviewButton() {
  return (
    <div className="flex flex-wrap gap-3">
      <Btn variant="primary">Primary</Btn>
      <Btn variant="secondary">Secondary</Btn>
      <Btn variant="danger">Danger</Btn>
      <Btn variant="primary" disabled>Disabled</Btn>
    </div>
  )
}

function PreviewCard() {
  return (
    <Card>
      <p className="text-sm text-slate-600 dark:text-slate-300">White / dark rounded container with p-6 padding and a border.</p>
    </Card>
  )
}

function PreviewErrorBanner() {
  return <ErrorBanner message="Something went wrong. Please try again." />
}

function PreviewInput() {
  const [v, setV] = useState('')
  return (
    <div className="space-y-3 max-w-xs">
      <Input label="With label" placeholder="Type something…" value={v} onChange={e => setV(e.target.value)} />
      <Input placeholder="Without label" />
      <Input placeholder="Disabled" disabled />
    </div>
  )
}

function PreviewLabel() {
  return <Label>Standalone Label element</Label>
}

function PreviewModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Btn variant="secondary" onClick={() => setOpen(true)}>Open Modal</Btn>
      {open && (
        <Modal title="Example Modal" onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-600 dark:text-slate-300">Modal body content. Click × or the buttons below to close.</p>
          <div className="mt-4 flex gap-2 justify-end">
            <Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => setOpen(false)}>Confirm</Btn>
          </div>
        </Modal>
      )}
    </>
  )
}

function PreviewPageTitle() {
  return <PageTitle>Page Title</PageTitle>
}

function PreviewSpinner() {
  return (
    <div className="flex items-center gap-8">
      {(['sm', 'md', 'lg'] as const).map(size => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Spinner size={size} />
          <span className="text-xs text-slate-500">{size}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewToggle() {
  const [a, setA] = useState(true)
  const [b, setB] = useState(false)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Toggle checked={a} onChange={setA} />
        <span className="text-sm text-slate-600 dark:text-slate-300">{a ? 'On' : 'Off'}</span>
      </div>
      <div className="flex items-center gap-3">
        <Toggle checked={b} onChange={setB} />
        <span className="text-sm text-slate-600 dark:text-slate-300">{b ? 'On' : 'Off'}</span>
      </div>
      <div className="flex items-center gap-3">
        <Toggle checked disabled onChange={() => {}} />
        <span className="text-sm text-slate-400">Disabled (on)</span>
      </div>
    </div>
  )
}

function PreviewBadge() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warn">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="success" dot>With dot</Badge>
      <Badge variant="error" dot>Critical</Badge>
    </div>
  )
}

function PreviewStatCard() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard value="1,284" label="Total Records" sub="across all sources" />
      <StatCard value="99.8%" label="Uptime" sub="last 30 days" />
    </div>
  )
}

function PreviewTabs() {
  const [active, setActive] = useState('one')
  return (
    <div className="space-y-3">
      <Tabs
        tabs={[{ key: 'one', label: 'Overview' }, { key: 'two', label: 'Details' }, { key: 'three', label: 'Logs' }]}
        active={active}
        onChange={setActive}
      />
      <p className="text-sm text-slate-500">Active: <strong className="text-slate-700 dark:text-slate-300">{active}</strong></p>
    </div>
  )
}

function PreviewProgressBar() {
  return (
    <div className="space-y-3 max-w-xs">
      <ProgressBar value={72} label="Upload" color="blue" />
      <ProgressBar value={48} label="Storage" color="amber" />
      <ProgressBar value={90} label="CPU load" color="red" />
    </div>
  )
}

function PreviewChip() {
  const [chips, setChips] = useState(['AAPL', 'TSLA', 'MSFT'])
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(c => (
        <Chip key={c} onRemove={() => setChips(p => p.filter(x => x !== c))}>{c}</Chip>
      ))}
      <Chip>Read-only</Chip>
    </div>
  )
}

function PreviewDropZone() {
  const [file, setFile] = useState<File | null>(null)
  return (
    <div className="max-w-xs">
      <DropZone file={file} hint="CSV, XLSX — max 50 MB" onFiles={([f]) => setFile(f)} />
      {file && <Btn variant="secondary" className="mt-2" onClick={() => setFile(null)}>Clear</Btn>}
    </div>
  )
}

/** Maps component name → preview factory. Add new entries here when registering a component. */
export const previewRegistry: Partial<Record<string, React.FC>> = {
  Button:      PreviewButton,
  Card:        PreviewCard,
  ErrorBanner: PreviewErrorBanner,
  Input:       PreviewInput,
  Label:       PreviewLabel,
  Modal:       PreviewModal,
  PageTitle:   PreviewPageTitle,
  Spinner:     PreviewSpinner,
  Toggle:      PreviewToggle,
  Badge:       PreviewBadge,
  StatCard:    PreviewStatCard,
  Tabs:        PreviewTabs,
  ProgressBar: PreviewProgressBar,
  Chip:        PreviewChip,
  DropZone:    PreviewDropZone,
}
