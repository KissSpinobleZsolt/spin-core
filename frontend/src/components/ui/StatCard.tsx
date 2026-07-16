interface StatCardProps {
  value: string | number
  label: string
  sub?: string
}

export function StatCard({ value, label, sub }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3">
      <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
