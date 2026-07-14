import { useModelStatus, type ModelInfo } from '../../hooks/useModelStatus'

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${bytes} B`
}

function ModelRow({ model }: { model: ModelInfo }) {
  const ready = model.status === 'ready'
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={ready ? 'text-emerald-400' : 'text-amber-400'}>
        {ready ? '✓' : '○'}
      </span>
      <span className="font-mono text-slate-200">{model.model}</span>
      <span className={ready ? 'text-emerald-400' : 'text-amber-300'}>
        {ready ? 'ready' : 'downloading…'}
      </span>
      {ready && model.size_bytes != null && (
        <span className="text-slate-400">({formatBytes(model.size_bytes)})</span>
      )}
    </div>
  )
}

export function ModelStatusBanner() {
  const { status, dismissed, dismiss } = useModelStatus()

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
      <div className="flex flex-col gap-1.5">
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
        <div className="flex flex-col gap-1 pl-1">
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
