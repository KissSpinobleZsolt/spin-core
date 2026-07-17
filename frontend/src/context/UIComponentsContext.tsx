import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { uiComponentsService, type UIComponentDoc } from '@services'

interface UIComponentsContextValue {
  components: UIComponentDoc[]
  loading: boolean
  error: string | null
}

const UIComponentsContext = createContext<UIComponentsContextValue | null>(null)

/** Fetches UI component docs from the API once on mount and makes them available to the subtree. */
export function UIComponentsProvider({ children }: { children: ReactNode }) {
  const [components, setComponents] = useState<UIComponentDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    uiComponentsService.getAll()
      .then(setComponents)
      .catch(() => setError('Failed to load component docs'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <UIComponentsContext.Provider value={{ components, loading, error }}>
      {children}
    </UIComponentsContext.Provider>
  )
}

/** Returns UI component docs, loading state, and error; must be inside UIComponentsProvider. */
export function useUIComponents(): UIComponentsContextValue {
  const ctx = useContext(UIComponentsContext)
  if (!ctx) throw new Error('useUIComponents must be used inside UIComponentsProvider')
  return ctx
}
