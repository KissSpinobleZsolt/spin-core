/** @file Pagination — Page navigator with ellipsis compression and jump-to input. */
import { useState } from 'react'

export interface PaginationProps {
  page: number
  totalPages: number
  onPage: (p: number) => void
}

function buildPages(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

export function Pagination({ page, totalPages, onPage }: PaginationProps) {
  const [jumpInput, setJumpInput] = useState('')

  function jumpToPage() {
    const n = parseInt(jumpInput, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) onPage(n)
    setJumpInput('')
  }

  const btnCls =
    'px-2 py-1 rounded text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors'

  return (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Page {page} of {totalPages}
      </span>

      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1} className={btnCls}>«</button>
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className={`${btnCls} px-2.5`}>‹ Prev</button>
        {buildPages(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`w-7 h-7 rounded text-xs font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : btnCls}`}
            >
              {p}
            </button>
          ),
        )}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={`${btnCls} px-2.5`}>Next ›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages} className={btnCls}>»</button>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">Jump to</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpInput}
          onChange={e => setJumpInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && jumpToPage()}
          placeholder={String(page)}
          className="w-14 px-2 py-1 rounded text-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={jumpToPage} className={btnCls}>Go</button>
      </div>
    </div>
  )
}
