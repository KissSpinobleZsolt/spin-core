import { createContext, useContext, type ReactNode } from 'react'
import { useModelStatus, type ModelStatusPayload } from '../hooks/useModelStatus'

interface ModelStatusContextValue {
  status: ModelStatusPayload | null
  dismissed: boolean
  dismiss: () => void
}

const ModelStatusContext = createContext<ModelStatusContextValue>({
  status: null,
  dismissed: false,
  dismiss: () => {},
})

/** Wraps useModelStatus and exposes model pull progress to the component tree. */
export function ModelStatusProvider({ children }: { children: ReactNode }) {
  const value = useModelStatus()
  return <ModelStatusContext.Provider value={value}>{children}</ModelStatusContext.Provider>
}

/** Returns the current model status payload, dismissal state, and a dismiss callback. */
export function useModelStatusContext() {
  return useContext(ModelStatusContext)
}
