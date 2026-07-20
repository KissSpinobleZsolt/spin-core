import type { ToggleProps } from './ToggleProps.type'
import './Toggle.style.css'

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`toggle__track ${checked ? 'bg-blue-600' : 'bg-slate-400 dark:bg-slate-600'}`}
    >
      <span className={`toggle__thumb ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}
