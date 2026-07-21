import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@store'
import { healthService } from '@services'

const INTERVAL_MS = Number(import.meta.env.VITE_HEALTH_INTERVAL_MS) || 30_000

/** Polls GET /api/health on a 30 s interval; only active when a user is logged in. */
export function useHealthQuery() {
  const user = useAuthStore(s => s.user)
  return useQuery({
    queryKey: ['health'],
    queryFn: () => healthService.fetch(),
    refetchInterval: INTERVAL_MS,
    enabled: !!user,
    staleTime: 0,  // health data is never considered fresh — always reflect the latest poll
  })
}
