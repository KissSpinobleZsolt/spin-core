import type { BadgeProps } from './BadgeProps.type'
import { RING } from './RING.constant'
import { DOT } from './DOT.constant'

export function Badge({ children, variant = 'neutral', dot }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${RING[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[variant]}`} />}
      {children}
    </span>
  )
}
