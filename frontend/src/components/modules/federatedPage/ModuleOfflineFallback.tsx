/** Shown when a module's remote container was probed as unreachable before attempting federation. */
export function ModuleOfflineFallback({ name, remoteUrl }: { name: string; remoteUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <span className="text-4xl">🔌</span>
      <p className="text-lg font-medium text-slate-300">{name} is offline</p>
      <p className="text-sm text-slate-500">
        The module server at <span className="font-mono">{remoteUrl.replace(/\/remoteEntry\.js$/, '')}</span> is not reachable.
      </p>
      <p className="text-xs text-slate-600">Start the module container and reload to reconnect.</p>
    </div>
  )
}
