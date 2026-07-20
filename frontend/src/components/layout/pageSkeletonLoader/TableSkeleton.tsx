import { Pulse } from './Pulse'
import { Table, type TableColumn } from '@components/ui/Table' // shared data table

/** Skeleton placeholder for table-layout pages. */
export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  // Build column definitions — each renders animated Pulse placeholders as header and cell
  const colDefs: TableColumn<number>[] = Array.from({ length: columns }, (_, i) => ({
    key: String(i),
    header: <Pulse className="h-3 w-16" />,
    cell: () => <Pulse className={`h-4 ${i === 0 ? 'w-32' : i === columns - 1 ? 'w-20' : 'w-24'}`} />, // vary width so columns look distinct
  }))

  const skeletonRows = Array.from({ length: rows }, (_, i) => i) // numeric indices as placeholder row data

  return (
    <div className="max-w-5xl space-y-6">
      <Pulse className="h-8 w-48" />
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        <Table<number>
          columns={colDefs}
          rows={skeletonRows}
          rowKey={(_, i) => i}
        />
        <Pulse className="h-9 w-28" />
      </div>
    </div>
  )
}
