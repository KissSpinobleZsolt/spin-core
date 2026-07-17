import type { BadgeVariant } from './BadgeVariant.type'

/** Tailwind background color for the optional status dot inside a badge. */
export const DOT: Record<BadgeVariant, string> = {
  info:    'bg-blue-500',
  success: 'bg-green-500',
  warn:    'bg-amber-500',
  error:   'bg-red-500',
  neutral: 'bg-slate-400',
}
