/** Animated placeholder rectangle for skeleton loading states. */
export function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${className}`} />
}
