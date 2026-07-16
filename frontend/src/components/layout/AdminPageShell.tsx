import type { ReactNode } from 'react'

interface Props { children: ReactNode; maxWidth?: string }

export function AdminPageShell({ children, maxWidth = 'max-w-4xl' }: Props) {
  return <div className={`${maxWidth} space-y-6`}>{children}</div>
}
