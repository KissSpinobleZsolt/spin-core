import { useState } from 'react'
import { Toggle } from '../@components/ui/toggle' // on/off switch

// Shows two interactive toggles and one disabled toggle.
export function PreviewToggle() {
  const [a, setA] = useState(true) // first toggle defaults on
  const [b, setB] = useState(false) // second toggle defaults off
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Toggle checked={a} onChange={setA} />
        <span className="text-sm text-slate-600 dark:text-slate-300">{a ? 'On' : 'Off'}</span>
      </div>
      <div className="flex items-center gap-3">
        <Toggle checked={b} onChange={setB} />
        <span className="text-sm text-slate-600 dark:text-slate-300">{b ? 'On' : 'Off'}</span>
      </div>
      <div className="flex items-center gap-3">
        <Toggle checked disabled onChange={() => {}} /> {/* non-interactive disabled-on state */}
        <span className="text-sm text-slate-400">Disabled (on)</span>
      </div>
    </div>
  )
}
