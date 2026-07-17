import type { DocPageShellProps } from './DocPageShellProps.type'

export function DocPageShell({ children, maxWidth = 'max-w-4xl', gap = 'space-y-6' }: DocPageShellProps) {
  return <div className={`p-6 ${maxWidth} mx-auto ${gap}`}>{children}</div>
}
