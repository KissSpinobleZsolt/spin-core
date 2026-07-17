import type { AdminPageShellProps } from './AdminPageShellProps.type'

export function AdminPageShell({ children, maxWidth = 'max-w-4xl' }: AdminPageShellProps) {
  return <div className={`${maxWidth} space-y-6`}>{children}</div>
}
