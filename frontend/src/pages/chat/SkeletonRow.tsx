export function SkeletonRow({ labelW = 'w-1/4', valueW = 'flex-1' }: { labelW?: string; valueW?: string }) { // animated placeholder row for config skeleton
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <div className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-600 shrink-0" />
      <div className={`h-2.5 rounded bg-slate-300 dark:bg-slate-600 ${labelW}`} />
      <div className={`h-2.5 rounded bg-slate-200 dark:bg-slate-700 ${valueW}`} />
    </div>
  )
}
