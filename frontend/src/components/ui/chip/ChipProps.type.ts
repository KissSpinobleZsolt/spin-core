import type { ReactNode } from 'react'

/** Props for the Chip component. */
export interface ChipProps {
  children: ReactNode
  onRemove?: () => void
}
