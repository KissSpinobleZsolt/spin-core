import type { ProgressBarProps } from './ProgressBarProps.type'
import { COLOR } from './COLOR.constant'
import './ProgressBar.style.css'

export function ProgressBar({ value, label, color = 'blue' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="progress-bar__label">{label}</span>
          <span className="progress-bar__pct">{pct}%</span>
        </div>
      )}
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill ${COLOR[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
