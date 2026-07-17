import type { Variant } from './Variant.type'

/** Tailwind classes for each button variant. */
export const variants: Record<Variant, string> = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
}
