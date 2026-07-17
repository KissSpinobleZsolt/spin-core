import type { ModelInfo } from '@hooks'
import { ProgressBar } from './ProgressBar'
import { formatBytes } from './formatBytes'
import { statusLabel } from './statusLabel'

/** Displays the name, status, and download progress for a single Ollama model. */
export function ModelRow({ model }: { model: ModelInfo }) {
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
