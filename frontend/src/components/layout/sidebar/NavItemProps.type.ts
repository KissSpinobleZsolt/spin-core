import type { ReactNode } from 'react'

/** Props for the NavItem sidebar link. */
export interface NavItemProps {
  to: string
  end?: boolean
  icon: ReactNode
  label: string
  collapsed: boolean
}
