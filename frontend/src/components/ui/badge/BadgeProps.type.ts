import type { ReactNode } from 'react'
import type { BadgeVariant } from './BadgeVariant.type'

/** Props for the Badge component. */
export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
}
