import { apiService, type InstalledModelsData } from '@services' // installed model data shape
import { useGet } from '@hooks' // data fetch hook
import { Spinner } from '@components/ui/spinner' // loading indicator
import { fmtBytes } from '@utils' // human-readable file size
import { SectionCard } from './SectionCard' // section wrapper

export function InstalledLLMsSection() { // lists Ollama models with size and family
  const { data, isLoading } = useGet<InstalledModelsData>(
    ['status-llms'],
    () => apiService.get<InstalledModelsData>('/model-status/installed'),
  )

  return (
    <SectionCard title="Installed LLMs" navigateTo="/admin/llms">
      {isLoading && <Spinner size="sm" />}
      {data?.ollama === 'unreachable' && (
        <p className="text-sm text-amber-600 dark:text-amber-400">Ollama unreachable</p>
      )}
      {data?.ollama === 'ok' && data.models.length === 0 && (
        <p className="text-sm text-slate-500">No models installed.</p>
      )}
      {data?.ollama === 'ok' && data.models.length > 0 && (
        <div className="space-y-2">
          {data.models.map(m => (
            <div key={m.name} className="flex items-center gap-3 text-sm">
              <span className="font-mono font-medium text-slate-800 dark:text-white truncate flex-1">{m.name}</span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">{m.family ?? '—'}</span>
              <span className="text-slate-500 dark:text-slate-400 shrink-0">{m.parameter_size ?? '—'}</span>
              <span className="text-slate-400 shrink-0 text-xs">
                {m.size_bytes != null ? fmtBytes(m.size_bytes) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
