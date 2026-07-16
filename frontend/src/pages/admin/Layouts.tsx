import { useState } from 'react'
import { PageTitle } from '../../components/ui/PageTitle'
import { AdminPageShell } from '../../components/layout/AdminPageShell'
import { DocPageShell } from '../../components/layout/DocPageShell'
import { Tabs } from '../../components/ui/Tabs'
import { Card } from '../../components/ui/Card'
import { Btn } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { DropZone } from '../../components/ui/DropZone'
import { Input } from '../../components/ui/Input'


// ─── Layout 1: Anoma Scan (AnomaScan) ───────────────────────────────────────

const DUMMY_EVENTS = [
  { ts: '0:04', labels: ['person', 'bag'],    conf: [{ l: 'person', p: 94 }, { l: 'bag', p: 81 }] },
  { ts: '0:11', labels: ['car', 'truck'],     conf: [{ l: 'car', p: 97 }, { l: 'truck', p: 72 }] },
  { ts: '0:23', labels: ['bicycle'],          conf: [{ l: 'bicycle', p: 88 }] },
]

function AnomaScanLayout() {
  const [file, setFile]         = useState<File | null>(null)
  const [ftFile, setFtFile]     = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [running, setRunning]   = useState(false)

  function simulate() {
    if (!file) return
    setRunning(true)
    setProgress(5)
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 95) { clearInterval(id); setRunning(false); return 100 }
        return p + 10
      })
    }, 300)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">👁️</span>
        <div>
          <p className="font-bold text-slate-800 dark:text-white">Anoma Scan</p>
          <p className="text-sm text-slate-500">YOLO object detection on video — upload, analyze, fine-tune</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Analyze Video</p>
          <div className="mb-3">
            <label className="block text-xs text-slate-500 mb-1">Model</label>
            <select className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>yolov8n (base)</option>
              <option>yolov8s (small)</option>
            </select>
          </div>
          <DropZone
            file={file}
            hint="MP4, AVI, MOV — max 500 MB"
            accept="video/*"
            onFiles={([f]) => { setFile(f); setProgress(0) }}
          />
          {progress > 0 && (
            <div className="mt-3">
              <ProgressBar value={progress} label={running ? `Processing… ${progress}%` : 'Done'} color={progress === 100 ? 'green' : 'blue'} />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Btn disabled={!file || running} onClick={simulate}>
              {running ? 'Analyzing…' : 'Run YOLO'}
            </Btn>
            {file && !running && (
              <Btn variant="secondary" onClick={() => { setFile(null); setProgress(0) }}>Clear</Btn>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Fine-Tune Model</p>
          <p className="text-sm text-slate-500 mb-3">
            Upload a ZIP with a YOLO-format labeled dataset (images/ + labels/ + data.yaml). A new model will be trained for your custom classes.
          </p>
          <DropZone
            file={ftFile}
            hint=".zip — YOLO dataset format"
            accept=".zip"
            onFiles={([f]) => setFtFile(f)}
          />
          <div className="mt-3">
            <Input label="Epochs" type="number" defaultValue="10" />
          </div>
          <div className="mt-3">
            <Btn disabled={!ftFile}>Start Training</Btn>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Detection Events</p>
          <div className="flex gap-2">
            {(['Events', 'Classes', 'Top label'] as const).map((l, i) => (
              <div key={l} className="text-center px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="font-bold text-slate-800 dark:text-white text-sm">{[3, 4, 2][i]}</p>
                <p className="text-[10px] text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {DUMMY_EVENTS.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5">
              <span className="text-xs font-mono text-blue-500 pt-0.5 w-10 shrink-0">{ev.ts}</span>
              <div>
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {ev.labels.map(l => <Badge key={l} variant="info">{l}</Badge>)}
                </div>
                <p className="text-xs text-slate-400">
                  {ev.conf.map(c => `${c.l} ${c.p}%`).join('  ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Layout 2: Cloud Insight AI (Cloud Insight AI) ──────────────────────────────

const DUMMY_SOURCES = [
  { id: 1, name: 'sales_q1_2025.csv',      type: 'CSV',  rows: 12480, size: '1.2 MB', status: 'ready'      as const, updated: '2 hours ago' },
  { id: 2, name: 'customer_export.xlsx',   type: 'XLSX', rows: 4305,  size: '840 KB', status: 'ready'      as const, updated: 'Yesterday'   },
  { id: 3, name: 'product_catalog.json',   type: 'JSON', rows: 892,   size: '310 KB', status: 'processing' as const, updated: 'Just now'    },
  { id: 4, name: 'warehouse_inventory.csv',type: 'CSV',  rows: 0,     size: '2.1 MB', status: 'error'      as const, updated: '3 days ago'  },
]

const STATUS_VARIANT = { ready: 'success', processing: 'info', error: 'error' } as const

function CloudInsightAILayout() {
  const [sources, setSources] = useState(DUMMY_SOURCES)

  function handleDrop(files: File[]) {
    const newRows = files.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      type: f.name.split('.').pop()?.toUpperCase() ?? 'FILE',
      rows: 0,
      size: f.size > 1_048_576 ? `${(f.size / 1_048_576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
      status: 'processing' as const,
      updated: 'Just now',
    }))
    setSources(p => [...newRows, ...p])
  }

  const totalRows  = sources.reduce((s, r) => s + r.rows, 0)
  const readyCount = sources.filter(r => r.status === 'ready').length

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="font-bold text-slate-800 dark:text-white">📥 Cloud Insight AI</p>
          <p className="text-sm text-slate-500">Upload, process, and manage structured data sources.</p>
        </div>
        <Btn>+ New Connection</Btn>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={sources.length}            label="Data Sources"   sub={`${readyCount} ready`} />
        <StatCard value={totalRows.toLocaleString()} label="Total Records"  sub="across all sources" />
        <StatCard value="2 hrs ago"                 label="Last Ingestion" sub="sales_q1_2025.csv" />
        <StatCard value="4.4 MB"                    label="Storage Used"   sub="of workspace quota" />
      </div>

      <DropZone hint="CSV, XLSX, JSON — max 50 MB per file" onFiles={handleDrop} />

      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Data Sources</p>
          <div className="flex gap-2">
            <Btn variant="secondary">Refresh</Btn>
            <Btn variant="secondary">Export</Btn>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500">
                {['Name', 'Type', 'Rows', 'Size', 'Status', 'Updated'].map(h => (
                  <th key={h} className="pb-2 pr-4 font-semibold uppercase tracking-wide text-[11px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sources.map(src => (
                <tr key={src.id}>
                  <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">{src.name}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant="info">{src.type}</Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500">{src.rows.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{src.size}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={STATUS_VARIANT[src.status]} dot>{src.status}</Badge>
                  </td>
                  <td className="py-2.5 text-slate-400">{src.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Shell demos ──────────────────────────────────────────────────────────────

function AdminShellDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">AdminPageShell</code>
        {' '}constrains width and stacks children with <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">space-y-6</code>.
        Pass <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">maxWidth</code> to override (default <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">max-w-4xl</code>).
      </p>
      <AdminPageShell maxWidth="max-w-2xl">
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">First card — <code className="font-mono text-xs">max-w-2xl</code></p></Card>
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Second card — same gap as every admin page</p></Card>
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Third card — no extra wrapper needed</p></Card>
      </AdminPageShell>
    </div>
  )
}

function DocShellDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">DocPageShell</code>
        {' '}adds <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">p-6</code> and centres the column.
        Props: <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">maxWidth</code> (default <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">max-w-4xl</code>),
        {' '}<code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">gap</code> (default <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">space-y-6</code>).
      </p>
      <DocPageShell maxWidth="max-w-2xl">
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Padded + centred — like every docs page</p></Card>
        <Card><p className="text-sm text-slate-600 dark:text-slate-300">Same shell used by Api, UI, Deployment, Components</p></Card>
      </DocPageShell>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LAYOUT_TABS = [
  { key: 'vision',    label: '👁️ Anoma Scan' },
  { key: 'ingestion', label: '📥 Cloud Insight AI' },
  { key: 'admin',     label: '🗂️ AdminPageShell' },
  { key: 'doc',       label: '📄 DocPageShell' },
]

export default function Layouts() {
  const [active, setActive] = useState('vision')

  return (
    <DocPageShell maxWidth="max-w-5xl">
      <PageTitle>Layouts</PageTitle>

      <Tabs tabs={LAYOUT_TABS} active={active} onChange={setActive} />

      <div className="pt-2">
        {active === 'vision'    && <AnomaScanLayout />}
        {active === 'ingestion' && <CloudInsightAILayout />}
        {active === 'admin'     && <AdminShellDemo />}
        {active === 'doc'       && <DocShellDemo />}
      </div>
    </DocPageShell>
  )
}
