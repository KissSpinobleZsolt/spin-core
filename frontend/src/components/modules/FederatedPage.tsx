import { Component, type ReactNode, Suspense, useEffect, useState, type ComponentType } from 'react'
import { useParams } from 'react-router-dom'
import { useSettings } from '@context'
import { loadFederatedModule } from '@utils'
import { Spinner } from '../ui/spinner'
import { ModuleBotPanel } from './ModuleBotPanel'

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

function ModuleErrorFallback({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
      <span className="text-4xl">⚠️</span>
      <p className="text-lg font-medium text-slate-300">Failed to load module</p>
      <p className="text-sm">Could not connect to remote: <span className="font-mono text-slate-500">{name}</span></p>
    </div>
  )
}

function ModuleOfflineFallback({ name, remoteUrl }: { name: string; remoteUrl: string }) {
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

export function FederatedPage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const { modules, moduleReachability } = useSettings()
  const mod = modules.find(m => m.id === moduleId)

  const [RemoteComponent, setRemoteComponent] = useState<ComponentType<{ presets?: Record<string, unknown> }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mod) return
    setRemoteComponent(null)
    setError(null)
    loadFederatedModule(mod.remote_url, mod.scope, mod.component)
      .then(Comp => setRemoteComponent(() => Comp))
      .catch(err => setError(String(err)))
  }, [mod?.id])

  if (!mod) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Module not found.
      </div>
    )
  }

  // Skip the federation loader entirely when the server is known-offline to avoid a confusing blank/crash
  if (moduleReachability[mod.id] === false) {
    return <ModuleOfflineFallback name={mod.name} remoteUrl={mod.remote_url} />
  }

  if (error) {
    return <ModuleErrorFallback name={mod.name} />
  }

  if (!RemoteComponent) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
        <Spinner size="lg" />
        <span>Loading {mod.name}…</span>
      </div>
    )
  }

  return (
    <>
      <ErrorBoundary fallback={<ModuleErrorFallback name={mod.name} />}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64 text-slate-400">
            <Spinner size="lg" />
          </div>
        }>
          <RemoteComponent presets={mod.presets as unknown as Record<string, unknown>} />
        </Suspense>
      </ErrorBoundary>
      <ModuleBotPanel moduleId={mod.id} />
    </>
  )
}
