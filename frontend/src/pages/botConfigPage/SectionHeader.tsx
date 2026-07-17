export function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) { // collapsible section toggle button
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-1 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
    >
      {title}
      <span className="text-slate-300 dark:text-slate-600">{open ? '▲' : '▼'}</span>
    </button>
  )
}
