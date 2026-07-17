import type { BadgeVariant } from './BadgeVariant.type'

/** Tailwind background + text classes for each badge variant. */
export const RING: Record<BadgeVariant, string> = {
  info:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  success: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  warn:    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  error:   'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
}
