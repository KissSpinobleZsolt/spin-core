import { useModelStatusContext } from '@context'
import { ModelRow } from './ModelRow'

export function ModelStatusBanner() {
  const { status, dismissed, dismiss } = useModelStatusContext()

  if (dismissed || status === null) return null

  const allReady = status.all_ready
  const unreachable = status.ollama === 'unreachable'

  return (
    <div
      className={`
        flex items-start justify-between gap-4 px-4 py-3 text-sm
        border-b transition-colors
        ${allReady
          ? 'bg-emerald-900/80 border-emerald-700'
          : unreachable
          ? 'bg-slate-800 border-slate-600'
          : 'bg-slate-800 border-amber-700/50'}
      `}
    >
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 font-medium text-slate-100">
          {allReady ? (
            <>
              <span className="text-emerald-400">✓</span>
              All models ready
            </>
          ) : unreachable ? (
            <>
              <span className="text-slate-400">⚠</span>
              Waiting for Ollama…
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Downloading models…
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 pl-1">
          {status.models.map((m) => (
            <ModelRow key={m.model} model={m} />
          ))}
        </div>
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="mt-0.5 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
      >
        ✕
      </button>
    </div>
  )
}
