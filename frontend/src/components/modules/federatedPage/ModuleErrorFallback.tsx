/** Shown when a federated remote fails to load or throws during render. */
export function ModuleErrorFallback({ name, error }: { name: string; error?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <span className="text-4xl">⚠️</span>
      <p className="text-lg font-medium text-slate-300">Failed to load module</p>
      <p className="text-sm">Could not connect to remote: <span className="font-mono text-slate-500">{name}</span></p>
      {error && (
        <p className="text-xs font-mono text-slate-600 max-w-lg text-center break-all">{error}</p>
      )}
    </div>
  )
}
