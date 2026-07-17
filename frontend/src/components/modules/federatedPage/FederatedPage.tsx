import { Suspense, useEffect, useState, type ComponentType } from 'react'
import { useParams } from 'react-router-dom'
import { useSettings } from '@context'
import { loadFederatedModule } from '@utils'
import { Spinner } from '../../ui/spinner'
import { ModuleBotPanel } from '../moduleBotPanel'
import { ErrorBoundary } from './ErrorBoundary'
import { ModuleErrorFallback } from './ModuleErrorFallback'
import { ModuleOfflineFallback } from './ModuleOfflineFallback'

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
