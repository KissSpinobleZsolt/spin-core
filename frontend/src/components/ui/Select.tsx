import { type ReactNode } from 'react' // children type

export function Select({ value, onChange, children, className }: { value: string; onChange: (v: string) => void; children: ReactNode, className: string }) { // local select wrapper — not shared with other pages
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className}>
      {children}
    </select>
  )
}
