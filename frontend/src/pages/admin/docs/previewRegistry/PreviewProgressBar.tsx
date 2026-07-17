import { ProgressBar } from '../../../../components/ui/progressBar' // labelled progress bar

// Shows three ProgressBar instances with different values and colours.
export function PreviewProgressBar() {
  return (
    <div className="space-y-3 max-w-xs">
      <ProgressBar value={72} label="Upload" color="blue" />
      <ProgressBar value={48} label="Storage" color="amber" />
      <ProgressBar value={90} label="CPU load" color="red" /> {/* high-value warning red */}
    </div>
  )
}
