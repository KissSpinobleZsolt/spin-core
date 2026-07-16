interface ChipProps {
  children: React.ReactNode
  onRemove?: () => void
}

export function Chip({ children, onRemove }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 leading-none"
        >
          ×
        </button>
      )}
    </span>
  )
}
