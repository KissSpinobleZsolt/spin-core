export function SkeletonSection({ title, children }: { title: string; children: React.ReactNode }) { // section group of skeleton rows
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}
