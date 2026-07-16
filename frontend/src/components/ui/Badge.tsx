type BadgeVariant = 'info' | 'success' | 'warn' | 'error' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
}

const RING: Record<BadgeVariant, string> = {
  info:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  success: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  warn:    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  error:   'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
}

const DOT: Record<BadgeVariant, string> = {
  info:    'bg-blue-500',
  success: 'bg-green-500',
  warn:    'bg-amber-500',
  error:   'bg-red-500',
  neutral: 'bg-slate-400',
}

export function Badge({ children, variant = 'neutral', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${RING[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[variant]}`} />}
      {children}
    </span>
  )
}
