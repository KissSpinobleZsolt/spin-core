/** @file Table — Generic typed data table with consistent header, row, and empty-state styling. */

import type { Key, ReactNode } from 'react'

/** Defines a single column in a Table: its header label, cell renderer, and optional style overrides. */
export interface TableColumn<T> {
  /** Stable identifier used as the React key for `<th>` and `<td>` elements. */
  key: string
  /** Content rendered in the header cell; omit for header-less columns such as action columns. */
  header?: ReactNode
  /** Renders the cell content for a given data row. */
  cell: (row: T) => ReactNode
  /** Extra Tailwind classes applied to every `<td>` in this column. */
  className?: string
  /** Extra Tailwind classes applied to the `<th>` header cell. */
  headerClassName?: string
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  rows: T[]
  /** Returns a stable React key for each row. Index is provided as second arg when no natural ID exists. */
  rowKey: (row: T, index: number) => Key
  /** Content rendered when `rows` is empty; nothing is shown if omitted. */
  empty?: ReactNode
  /** Extra Tailwind classes on the `<table>` element. */
  className?: string
  /** Compact mode: text-xs, px-4 py-2 cells, thead background, row hover. Suited for dense data tables like logs. */
  compact?: boolean
  /** When provided, renders a full-width expansion row directly below each data row. Return null/undefined to render nothing for a given row. */
  renderExpansion?: (row: T) => ReactNode
}

/**
 * Generic data table.
 *
 * Renders a scrollable, consistently-styled table from a column-definition array.
 * All styling tokens (colors, spacing, dividers) follow the project's Tailwind design language
 * and support both light and dark mode out of the box.
 *
 * The last column receives no right padding so action buttons sit flush with the edge.
 * Pass `empty` to control what appears when there are no rows.
 */
export function Table<T>({ columns, rows, rowKey, empty, className = '', compact = false, renderExpansion }: TableProps<T>) {
  if (rows.length === 0) {
    return empty ? <>{empty}</> : null
  }

  const lastIdx = columns.length - 1
  // compact uses px-4 on every cell (not pr-4-only) because log tables need left padding too
  const cellPad = compact ? 'px-4 py-2' : 'py-2'
  const theadBg = compact ? 'bg-slate-50 dark:bg-slate-900/40' : ''
  const rowHover = compact ? 'hover:bg-slate-50 dark:hover:bg-slate-700/30' : ''

  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${compact ? 'text-xs' : 'text-sm'} ${className}`}>
        <thead>
          <tr className={`text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 ${theadBg}`}>
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={`${cellPad} font-medium ${!compact && i < lastIdx ? 'pr-4' : ''} ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((row, idx) => {
            const expansion = renderExpansion ? renderExpansion(row) : null  // null means no expansion for this row
            return (
              <>
                <tr key={rowKey(row, idx)} className={rowHover}>
                  {columns.map((col, i) => (
                    <td
                      key={col.key}
                      className={`${cellPad} ${!compact && i < lastIdx ? 'pr-4' : ''} ${col.className ?? ''}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
                {expansion && (  // expansion row spans all columns; no divider needed since it visually belongs to the row above
                  <tr key={`${rowKey(row, idx)}-expansion`}>
                    <td colSpan={columns.length} className="p-0">
                      {expansion}
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
