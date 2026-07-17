import { useState } from 'react'
import { useGet } from '@hooks'
import { apiService, type InstalledModelsData } from '@services'
import { Btn } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { PageTitle } from '../../components/ui/PageTitle'
import { AdminPageShell } from '../../components/layout/adminPageShell'
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

        {data?.ollama === 'ok' && data.models.length === 0 && (
          <p className="text-sm text-slate-500">No models installed yet.</p>
        )}

        {data?.ollama === 'ok' && data.models.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2 pr-4">Family</th>
                  <th className="pb-2 pr-4">Params</th>
                  <th className="pb-2 pr-4">Quantization</th>
                  <th className="pb-2 pr-4 text-right">Size</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {data.models.map(m => (
                  <tr key={m.name}>
                    <td className="py-2 pr-4 font-mono font-medium text-slate-800 dark:text-white">{m.name}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{m.family ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{m.parameter_size ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{m.quantization ?? '—'}</td>
                    <td className="py-2 pr-4 text-right text-slate-500 dark:text-slate-400">
                      {m.size_bytes != null ? fmtBytes(m.size_bytes) : '—'}
                    </td>
                    <td className="py-2">
                      <Btn
                        variant="danger"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => handleDelete(m.name)}
                        disabled={deletingModel === m.name}
                      >
                        {deletingModel === m.name ? 'Deleting…' : 'Delete'}
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <Btn variant="secondary" onClick={() => refetch()} disabled={isLoading}>↻ Refresh</Btn>
        </div>
      </div>
    </AdminPageShell>
  )
}
