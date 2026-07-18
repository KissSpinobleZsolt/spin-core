import { useState } from 'react'
import { Chip } from '@components/ui/chip' // removable tag chip

// Shows removable chips and a static read-only chip.
export function PreviewChip() {
  const [chips, setChips] = useState(['AAPL', 'TSLA', 'MSFT']) // mutable list of removable chip labels
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(c => (
        <Chip key={c} onRemove={() => setChips(p => p.filter(x => x !== c))}>{c}</Chip> // removes the chip on click
      ))}
      <Chip>Read-only</Chip> {/* chip without onRemove — no × button */}
    </div>
  )
}
