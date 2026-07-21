import type { ReactNode } from 'react'
import { useModules, useRefreshModules } from '@hooks/modules'
import type { SettingsContextValue } from './SettingsContextValue.type'

// SettingsProvider is now a no-op passthrough — module data is fetched via TanStack Query (useModules).
// The query is enabled:!!user so it auto-fires after login with no extra wiring.
export function SettingsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Returns the registered modules list and a refresh callback. Delegates to useModules TQ hook. */
export function useSettings(): SettingsContextValue {
  const { data } = useModules()
  const invalidate = useRefreshModules()
  return {
    modules: data?.modules ?? [],
    moduleReachability: data?.moduleReachability ?? {},
    refreshModules: async () => invalidate(),
  }
}
