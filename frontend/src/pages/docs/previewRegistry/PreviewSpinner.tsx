import { Spinner } from '@components/ui/spinner' // animated loading indicator

// Shows all three Spinner sizes (sm, md, lg) side by side with labels.
export function PreviewSpinner() {
  return (
    <div className="flex items-center gap-8">
      {(['sm', 'md', 'lg'] as const).map(size => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Spinner size={size} /> {/* one spinner per available size */}
          <span className="text-xs text-slate-500">{size}</span>
        </div>
      ))}
    </div>
  )
}
