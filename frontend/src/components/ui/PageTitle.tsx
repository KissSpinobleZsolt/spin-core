import { type ReactNode } from 'react'

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-xl font-bold text-slate-800 dark:text-white">{children}</h1>
}
