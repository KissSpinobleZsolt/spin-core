import { Pulse } from './Pulse'

/** Skeleton placeholder for document / prose pages. */
export function DocSkeleton({ rows = 8 }: { rows?: number }) {
  // Cycle through varying widths to simulate a realistic text block
  const widths = ['w-full', 'w-5/6', 'w-full', 'w-4/6', 'w-full', 'w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-full']
  return (
    <div className="max-w-4xl space-y-6">
      <Pulse className="h-8 w-56" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse key={i} className={`h-4 ${widths[i % widths.length]}`} />
        ))}
      </div>
    </div>
  )
}
