import { Pulse } from './Pulse'

/** Skeleton placeholder for table-layout pages. */
export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
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
