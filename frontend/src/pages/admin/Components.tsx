import { useState, useEffect } from 'react'
import { PageTitle } from '../../components/ui/PageTitle'
import { DocPageShell } from '../../components/layout/DocPageShell'
import { Btn } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { Toggle } from '../../components/ui/Toggle'
import { Badge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { Tabs } from '../../components/ui/Tabs'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Chip } from '../../components/ui/Chip'
import { DropZone } from '../../components/ui/DropZone'

const SECTION_TITLES = [
  'Button', 'Card', 'ErrorBanner', 'Input', 'Label', 'Modal',
  'PageTitle', 'Spinner', 'Toggle', 'Badge', 'StatCard', 'Tabs',
  'ProgressBar', 'Chip', 'DropZone',
]
const SECTION_IDS = SECTION_TITLES.map(t => t.toLowerCase())

function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    // root = <main> because that element carries overflow-y:auto; default viewport root would miss scroll events
    const root = document.querySelector('main')
    const visible = new Set<string>()

    const observers = ids.map(id => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visible.add(id)
          else visible.delete(id)
          const first = ids.find(i => visible.has(i))
          if (first) setActive(first)
        },
        // -60% bottom margin: a section is only "active" once it enters the top 40% of the viewport
        { root, rootMargin: '0px 0px -60% 0px', threshold: 0 },
      )
      obs.observe(el)
      return obs
    })

    return () => observers.forEach(o => o?.disconnect())
  }, [ids])

  return active
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div id={title.toLowerCase()}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
        {title}
      </h2>
      <Card>{children}</Card>
    </div>
  )
}

export default function Components() {
  const [modalOpen, setModalOpen] = useState(false)
  const [toggle1, setToggle1] = useState(true)
  const [toggle2, setToggle2] = useState(false)
  const [inputValue, setInputValue] = useState('Sample text')
  const [activeTab, setActiveTab] = useState('one')
  const [progress, setProgress] = useState(60)
  const [chips, setChips] = useState(['AAPL', 'TSLA', 'MSFT'])
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const active = useActiveSection(SECTION_IDS)

  return (
    <DocPageShell maxWidth="max-w-4xl" gap="space-y-8">
      <PageTitle>UI Components</PageTitle>

      <div className="flex gap-8 items-start">
        <nav className="w-40 shrink-0 sticky top-0 self-start">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Components</p>
          <ul className="space-y-0.5">
            {SECTION_TITLES.map(title => {
              const id = title.toLowerCase()
              const isActive = active === id
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isActive ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    {title}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex-1 min-w-0 space-y-8">
          <Section title="Button">
            <div className="flex flex-wrap gap-3">
              <Btn variant="primary">Primary</Btn>
              <Btn variant="secondary">Secondary</Btn>
              <Btn variant="danger">Danger</Btn>
              <Btn variant="primary" disabled>Disabled</Btn>
            </div>
          </Section>

          <Section title="Card">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Cards provide a white / dark rounded container with padding and a border. This text is inside a Card.
            </p>
          </Section>

          <Section title="ErrorBanner">
            <ErrorBanner message="Something went wrong. Please try again." />
          </Section>

          <Section title="Input">
            <div className="space-y-4 max-w-sm">
              <Input
                label="With label"
                placeholder="Type something…"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
              />
              <Input placeholder="Without label" />
              <Input label="Disabled" placeholder="Cannot edit" disabled />
            </div>
          </Section>

          <Section title="Label">
            <Label>Standalone Label element</Label>
          </Section>

          <Section title="Modal">
            <Btn variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Btn>
            {modalOpen && (
              <Modal title="Example Modal" onClose={() => setModalOpen(false)}>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Modal body content. Click × or the buttons below to close.
                </p>
                <div className="mt-4 flex gap-2 justify-end">
                  <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Btn>
                  <Btn variant="primary" onClick={() => setModalOpen(false)}>Confirm</Btn>
                </div>
              </Modal>
            )}
          </Section>

          <Section title="PageTitle">
            <PageTitle>This is a PageTitle</PageTitle>
          </Section>

          <Section title="Spinner">
            <div className="flex items-center gap-8">
              {(['sm', 'md', 'lg'] as const).map(size => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <Spinner size={size} />
                  <span className="text-xs text-slate-500">{size}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Toggle">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Toggle checked={toggle1} onChange={setToggle1} />
                <span className="text-sm text-slate-600 dark:text-slate-300">{toggle1 ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={toggle2} onChange={setToggle2} />
                <span className="text-sm text-slate-600 dark:text-slate-300">{toggle2 ? 'On' : 'Off'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked disabled onChange={() => {}} />
                <span className="text-sm text-slate-500">Disabled (on)</span>
              </div>
            </div>
          </Section>

          <Section title="Badge">
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">Info</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warn">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="success" dot>With dot</Badge>
              <Badge variant="error" dot>Critical</Badge>
            </div>
          </Section>

          <Section title="StatCard">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value="1,284"  label="Total Records" sub="across all sources" />
              <StatCard value="99.8%"  label="Uptime"        sub="last 30 days" />
              <StatCard value="42"     label="Active Bots"   />
              <StatCard value="3.2 GB" label="Storage Used"  sub="of 10 GB quota" />
            </div>
          </Section>

          <Section title="Tabs">
            <div className="space-y-4">
              <Tabs
                tabs={[{ key: 'one', label: 'Overview' }, { key: 'two', label: 'Details' }, { key: 'three', label: 'Logs' }]}
                active={activeTab}
                onChange={setActiveTab}
              />
              <p className="text-sm text-slate-500">Active tab: <strong className="text-slate-700 dark:text-slate-300">{activeTab}</strong></p>
            </div>
          </Section>

          <Section title="ProgressBar">
            <div className="space-y-4 max-w-sm">
              <ProgressBar value={progress} label="Upload progress" color="blue" />
              <ProgressBar value={78} label="Storage used" color="amber" />
              <ProgressBar value={95} label="CPU load" color="red" />
              <ProgressBar value={42} label="Completed tasks" color="green" />
              <div className="flex gap-2 mt-1">
                <Btn variant="secondary" onClick={() => setProgress(p => Math.max(0,  p - 10))}>−</Btn>
                <Btn variant="secondary" onClick={() => setProgress(p => Math.min(100, p + 10))}>+</Btn>
              </div>
            </div>
          </Section>

          <Section title="Chip">
            <div className="flex flex-wrap gap-2">
              {chips.map(c => (
                <Chip key={c} onRemove={() => setChips(p => p.filter(x => x !== c))}>{c}</Chip>
              ))}
              <Chip>Read-only</Chip>
            </div>
          </Section>

          <Section title="DropZone">
            <div className="max-w-sm">
              <DropZone
                file={droppedFile}
                hint="CSV, XLSX, JSON — max 50 MB"
                onFiles={([f]) => setDroppedFile(f)}
              />
              {droppedFile && (
                <Btn variant="secondary" className="mt-2" onClick={() => setDroppedFile(null)}>Clear</Btn>
              )}
            </div>
          </Section>
        </div>
      </div>
    </DocPageShell>
  )
}
