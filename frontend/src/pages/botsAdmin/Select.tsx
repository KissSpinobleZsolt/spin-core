import { type ReactNode } from 'react' // children type

export function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: ReactNode }) { // local select wrapper — not shared with other pages
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {children}
    </select>
  )
}
