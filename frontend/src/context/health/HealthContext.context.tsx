import type { ReactNode } from 'react'
import { useHealthQuery } from '../../hooks/health'
import type { HealthState } from './HealthState.type'

const DEFAULT: HealthState = { api: true, postgres: true, clickhouse: true, checkedAt: null }

// HealthProvider is now a no-op passthrough — health is fetched via TanStack Query (useHealthQuery).
// Kept so AuthGuard import doesn't break during the transition.
export function HealthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Returns the latest service health state. Delegates to useHealthQuery. */
export function useHealth(): HealthState {
  const { data } = useHealthQuery()
  return data ? { ...data, checkedAt: new Date() } : DEFAULT
}
