type ToggleProps = { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'} disabled:opacity-50`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}
