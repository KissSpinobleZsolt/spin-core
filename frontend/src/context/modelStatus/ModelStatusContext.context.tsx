import type { ReactNode } from 'react'
import { useModelStatusStore } from '@store'
import type { ModelStatusContextValue } from './ModelStatusContextValue.type'

// ModelStatusProvider is now a no-op passthrough — state lives in useModelStatusStore (Zustand).
// The SSE connection is opened by useBootstrap() in AuthGuard after login.
export function ModelStatusProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Returns Ollama model download progress. Delegates to useModelStatusStore. */
export function useModelStatusContext(): ModelStatusContextValue {
  const status = useModelStatusStore(s => s.status)
  const dismissed = useModelStatusStore(s => s.dismissed)
  const dismiss = useModelStatusStore(s => s.dismiss)
  return { status, dismissed, dismiss }
}
