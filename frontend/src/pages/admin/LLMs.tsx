import { useState } from 'react'
import { useGet } from '@hooks'
import { apiService, type InstalledModelsData, type InstalledModel } from '@services'
import { Btn } from '@components/ui/button'
import { Spinner } from '@components/ui/spinner'
import { ErrorBanner } from '@components/ui/ErrorBanner'
import { PageTitle } from '@components/ui/PageTitle'
import { AdminPageShell } from '@components/layout/adminPageShell'
import { Table } from '@components/ui/Table' // shared data table
import { fmtBytes } from '@utils'

export default function LLMs() {
  const { data, isLoading, isError, refetch } = useGet<InstalledModelsData>(
    ['admin-llms-installed'],
    () => apiService.get<InstalledModelsData>('/model-status/installed'),
  )

  const [pullName, setPullName] = useState('')
  const [pulling, setPulling] = useState(false)
  const [pullError, setPullError] = useState<string | null>(null)
  const [pullSuccess, setPullSuccess] = useState<string | null>(null)
  const [deletingModel, setDeletingModel] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handlePull() {
    const name = pullName.trim()
    if (!name) return
    setPulling(true)
    setPullError(null)
    setPullSuccess(null)
    try {
      await apiService.post('/model-status/pull', { name })
      setPullSuccess(`Pull started for "${name}". Refresh the list in a moment to see it appear.`)
      setPullName('')
    } catch (err) {
      setPullError(String(err))
    } finally {
      setPulling(false)
    }
  }

  async function handleDelete(modelName: string) {
    if (!confirm(`Delete model "${modelName}" from Ollama?`)) return
    setDeletingModel(modelName)
    setDeleteError(null)
    try {
      await apiService.delete(`/model-status/${encodeURIComponent(modelName)}`)
      await refetch()
    } catch (err) {
      setDeleteError(String(err))
    } finally {
      setDeletingModel(null)
    }
  }

  return (
    <AdminPageShell>
      <PageTitle>LLMs</PageTitle>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-3">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Pull model</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={pullName}
            onChange={e => setPullName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePull()}
            placeholder="e.g. llama3.2:3b"
            className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
          <Btn onClick={handlePull} disabled={pulling || !pullName.trim()} className="px-4 py-2">
            {pulling ? 'Starting…' : 'Pull'}
          </Btn>
        </div>
        {pullSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">{pullSuccess}</p>
        )}
        {pullError && <ErrorBanner message={pullError} />}
        <p className="text-xs text-slate-400">
          Only Ollama models are supported. The pull runs in the background — refresh the list to check progress.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Installed models</h2>

        {deleteError && <ErrorBanner message={deleteError} />}

        {isLoading && <Spinner />}
        {isError && <p className="text-sm text-red-500">Failed to reach backend.</p>}

        {data?.ollama === 'unreachable' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block shrink-0" />
            Ollama unreachable — no model information available
          </div>
        )}

        {data?.ollama === 'ok' && (
          <Table<InstalledModel>
            rows={data.models}
            rowKey={m => m.name}
            empty={<p className="text-sm text-slate-500">No models installed yet.</p>}
            columns={[
              {
                key: 'model',
                header: 'Model',
                className: 'font-mono font-medium text-slate-800 dark:text-white',
                cell: m => m.name,
              },
              {
                key: 'family',
                header: 'Family',
                className: 'text-slate-500 dark:text-slate-400',
                cell: m => m.family ?? '—',
              },
              {
                key: 'params',
                header: 'Params',
                className: 'text-slate-500 dark:text-slate-400',
                cell: m => m.parameter_size ?? '—',
              },
              {
                key: 'quantization',
                header: 'Quantization',
                className: 'text-slate-500 dark:text-slate-400',
                cell: m => m.quantization ?? '—',
              },
              {
                key: 'size',
                header: 'Size',
                className: 'text-right text-slate-500 dark:text-slate-400',
                headerClassName: 'text-right',
                cell: m => m.size_bytes != null ? fmtBytes(m.size_bytes) : '—',
              },
              {
                key: 'actions',
                cell: m => (
                  <Btn
                    variant="danger"
                    className="px-2.5 py-1 text-xs"
                    onClick={() => handleDelete(m.name)}
                    disabled={deletingModel === m.name}
                  >
                    {deletingModel === m.name ? 'Deleting…' : 'Delete'}
                  </Btn>
                ),
              },
            ]}
          />
        )}

        <div className="flex justify-end">
          <Btn variant="secondary" onClick={() => refetch()} disabled={isLoading}>↻ Refresh</Btn>
        </div>
      </div>
    </AdminPageShell>
  )
}
