import { Component, type ReactNode, Suspense, useEffect, useState, type ComponentType } from 'react'
import { useParams } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext'
import { loadFederatedModule } from '../../utils/federationLoader'

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

export function FederatedPage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const { modules } = useSettings()
  const mod = modules.find(m => m.id === moduleId)

  const [RemoteComponent, setRemoteComponent] = useState<ComponentType | null>(null)
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

  if (error) {
    return <ModuleErrorFallback name={mod.name} />
  }

  if (!RemoteComponent) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading {mod.name}…</span>
      </div>
    )
  }

  return (
    <ErrorBoundary fallback={<ModuleErrorFallback name={mod.name} />}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <RemoteComponent />
      </Suspense>
    </ErrorBoundary>
  )
}
