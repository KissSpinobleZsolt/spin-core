import type { SkeletonConfig } from '@services'

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} />
}

function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="max-w-5xl space-y-6">
      <Pulse className="h-8 w-48" />
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="pb-2 pr-4 text-left">
                    <Pulse className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r}>
                  {Array.from({ length: columns }).map((_, c) => (
                    <td key={c} className="py-3 pr-4">
                      <Pulse className={`h-4 ${c === 0 ? 'w-32' : c === columns - 1 ? 'w-20' : 'w-24'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pulse className="h-9 w-28" />
      </div>
    </div>
  )
}

function CardsSkeleton({ columns = 3, rows = 2 }: { columns?: number; rows?: number }) {
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

function DocSkeleton({ rows = 8 }: { rows?: number }) {
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

export function PageSkeletonLoader({ config }: { config?: SkeletonConfig }) {
  if (!config) {
    return <TableSkeleton />
  }
  if (config.type === 'cards') {
    return <CardsSkeleton columns={config.columns} rows={config.rows} />
  }
  if (config.type === 'doc') {
    return <DocSkeleton rows={config.rows} />
  }
  return <TableSkeleton columns={config.columns} rows={config.rows} />
}
