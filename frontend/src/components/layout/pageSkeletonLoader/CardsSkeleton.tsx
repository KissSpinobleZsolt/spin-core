import { Pulse } from './Pulse'

/** Skeleton placeholder for card-grid pages. */
export function CardsSkeleton({ columns = 3, rows = 2 }: { columns?: number; rows?: number }) {
  return (
    <div className="max-w-5xl space-y-6">
      <Pulse className="h-8 w-48" />
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns * rows }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
            <Pulse className="h-5 w-24" />
            <Pulse className="h-8 w-16" />
            <Pulse className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
