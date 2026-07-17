import type { ProgressColor } from './ProgressColor.type'

export interface ProgressBarProps {
  value: number
  label?: string
  color?: ProgressColor
}
