import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Btn } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { StatCard } from '../../../components/ui/statCard'
import { DropZone } from '../../../components/ui/dropZone'
import { DUMMY_SOURCES } from './DUMMY_SOURCES.constant'
import { STATUS_VARIANT } from './STATUS_VARIANT.constant'

// Demo layout for the Cloud Insight AI (data-ingestion) module — upload and manage data sources
export function CloudInsightAILayout() {
  const [sources, setSources] = useState(DUMMY_SOURCES) // list of data sources; grows when files are dropped

  function handleDrop(files: File[]) {
    const newRows = files.map((f, i) => ({ // build a stub source row for each dropped file
      id: Date.now() + i,                                                                              // unique id using current timestamp offset
      name: f.name,                                                                                    // original filename
      type: f.name.split('.').pop()?.toUpperCase() ?? 'FILE',                                         // derive type from extension, fallback to 'FILE'
      rows: 0,                                                                                         // row count unknown until processed
      size: f.size > 1_048_576 ? `${(f.size / 1_048_576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`, // human-readable size
      status: 'processing' as const,                                                                   // newly dropped files start as processing
      updated: 'Just now',
    }))
    setSources(p => [...newRows, ...p]) // prepend new rows so they appear at the top
  }

  const totalRows  = sources.reduce((s, r) => s + r.rows, 0)           // sum of all row counts across sources
  const readyCount = sources.filter(r => r.status === 'ready').length   // number of sources fully ingested

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
        <StatCard value={sources.length}             label="Data Sources"   sub={`${readyCount} ready`} />
        <StatCard value={totalRows.toLocaleString()}  label="Total Records"  sub="across all sources" />
        <StatCard value="2 hrs ago"                  label="Last Ingestion" sub="sales_q1_2025.csv" />
        <StatCard value="4.4 MB"                     label="Storage Used"   sub="of workspace quota" />
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
                    <Badge variant={STATUS_VARIANT[src.status]} dot>{src.status}</Badge> {/* dot prop adds a status indicator */}
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
