import { useState } from 'react'
import { useGet } from '../../hooks/useApi'
import { apiService } from '../../services/apiService'

type InstalledModel = {
  name: string
  size_bytes: number | null
  modified_at: string | null
  family: string | null
  parameter_size: string | null
  quantization: string | null
  format: string | null
}

type InstalledModelsData = {
  ollama: 'ok' | 'unreachable'
  models: InstalledModel[]
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${bytes} B`
}

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
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-slate-800 dark:text-white">LLMs</h1>

      {/* Pull a model */}
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
          <button
            type="button"
            onClick={handlePull}
            disabled={pulling || !pullName.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pulling ? 'Starting…' : 'Pull'}
          </button>
        </div>
        {pullSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">{pullSuccess}</p>
        )}
        {pullError && (
          <p className="text-sm text-red-500">{pullError}</p>
        )}
        <p className="text-xs text-slate-400">
          Only Ollama models are supported. The pull runs in the background — refresh the list to check progress.
        </p>
      </div>

      {/* Installed models */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Installed models</h2>

        {deleteError && (
          <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">{deleteError}</div>
        )}

        {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
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
                      <button
                        type="button"
                        onClick={() => handleDelete(m.name)}
                        disabled={deletingModel === m.name}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingModel === m.name ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
