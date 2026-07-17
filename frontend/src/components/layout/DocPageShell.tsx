import type { ReactNode } from 'react'

interface Props { children: ReactNode; maxWidth?: string; gap?: string }

export function DocPageShell({ children, maxWidth = 'max-w-4xl', gap = 'space-y-6' }: Props) {
  return <div className={`p-6 ${maxWidth} mx-auto ${gap}`}>{children}</div>
}
