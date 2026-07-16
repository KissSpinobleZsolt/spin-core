type ProgressColor = 'blue' | 'green' | 'amber' | 'red'

interface ProgressBarProps {
  value: number
  label?: string
  color?: ProgressColor
}

const COLOR: Record<ProgressColor, string> = {
  blue:  'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red:   'bg-red-500',
}

export function ProgressBar({ value, label, color = 'blue' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500">{label}</span>
          <span className="text-xs font-mono text-slate-400">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${COLOR[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
