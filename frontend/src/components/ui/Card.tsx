import { type ReactNode } from 'react'

export function Card({
  children,
  className = '',
  noPadding = false,
}: {
  children: ReactNode
  className?: string
  noPadding?: boolean
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 ${noPadding ? '' : 'p-6'} ${className}`}
    >
      {children}
    </div>
  )
}
