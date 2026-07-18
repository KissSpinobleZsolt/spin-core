import { useState } from 'react'
import { Input } from '@components/ui/input' // labelled text input field

// Shows Input with label, without label, and in a disabled state.
export function PreviewInput() {
  const [v, setV] = useState('') // controlled value for the labelled input
  return (
    <div className="space-y-3 max-w-xs">
      <Input label="With label" placeholder="Type something…" value={v} onChange={e => setV(e.target.value)} />
      <Input placeholder="Without label" />
      <Input placeholder="Disabled" disabled /> {/* non-interactive disabled variant */}
    </div>
  )
}
