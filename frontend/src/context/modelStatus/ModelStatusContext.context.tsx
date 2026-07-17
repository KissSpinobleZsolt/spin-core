import { createContext, useContext, type ReactNode } from 'react'
import { useModelStatus } from '@hooks'
import type { ModelStatusContextValue } from './ModelStatusContextValue.type'

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
export function useModelStatusContext(): ModelStatusContextValue {
  return useContext(ModelStatusContext)
}
