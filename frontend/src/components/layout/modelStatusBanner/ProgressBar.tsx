/** Accessible progress bar for model download progress. */
export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent)) // Clamp to [0, 100] to prevent overflows
  return (
    <div
      className="w-full bg-slate-700 rounded-full h-1"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="bg-amber-400 h-1 rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
