export function SectionTitle({ children }: { children: React.ReactNode }) { // section heading inside a Card
  return (
    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{children}</h3>
  )
}
