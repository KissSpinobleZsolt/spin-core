import { type ModelInfo } from '../../hooks/useModelStatus'
import { useModelStatusContext } from '../../context/ModelStatusContext'

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`
  return `${bytes} B`
}

function statusLabel(status: ModelInfo['status']): string {
  switch (status) {
    case 'pulling':   return 'downloading…'
    case 'verifying': return 'verifying…'
    case 'writing':   return 'writing…'
    case 'error':     return 'error'
    default:          return 'pending…'
  }
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div
      className="w-full bg-slate-700 rounded-full h-1"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="bg-amber-400 h-1 rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function ModelRow({ model }: { model: ModelInfo }) {
  const ready = model.status === 'ready'
  const p = model.progress
  const hasProgress = p !== null && p.total_bytes > 0

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-3">
        <span className={ready ? 'text-emerald-400' : 'text-amber-400'}>
          {ready ? '✓' : '○'}
        </span>
        <span className="font-mono text-slate-200">{model.model}</span>
        <span className={ready ? 'text-emerald-400' : 'text-amber-300'}>
          {ready ? 'ready' : statusLabel(model.status)}
        </span>
        {ready && model.size_bytes != null && (
          <span className="text-slate-400">({formatBytes(model.size_bytes)})</span>
        )}
        {!ready && hasProgress && (
          <span className="ml-auto text-slate-400">
            {formatBytes(p!.completed_bytes)} / {formatBytes(p!.total_bytes)}
          </span>
        )}
      </div>

      {!ready && hasProgress && (
        <div className="pl-6 flex flex-col gap-0.5">
          <ProgressBar percent={p!.percent} />
          <div className="flex justify-between text-slate-500" style={{ fontSize: '10px' }}>
            <span>{p!.speed_str}</span>
            {p!.eta_str && <span>ETA {p!.eta_str}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

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
