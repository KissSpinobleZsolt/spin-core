export function StatRow({ label, value }: { label: string; value: string }) { // label-value stat row inside a card
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-white">{value}</span>
    </div>
  )
}
