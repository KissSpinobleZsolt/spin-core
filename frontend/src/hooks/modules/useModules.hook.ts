import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@store'
import { settingsService } from '@services'
import type { ModuleConfig } from '@services'
import type { ReachabilityMap } from '@context'
import { probeModule } from '@context/settings/probeModule'

export interface ModulesData {
  modules: ModuleConfig[]
  moduleReachability: ReachabilityMap
}

/** Fetches the registered module list and probes each module's reachability. Auth-gated. */
export function useModules() {
  const user = useAuthStore(s => s.user)
  return useQuery<ModulesData>({
    queryKey: ['modules'],
    queryFn: async () => {
      const mods = await settingsService.getModules()
      const results = await Promise.allSettled(mods.map(probeModule))
      const moduleReachability: ReachabilityMap = {}
      results.forEach((r, i) => {
        moduleReachability[mods[i].id] = r.status === 'fulfilled' ? r.value : false
      })
      return { modules: mods, moduleReachability }
    },
    enabled: !!user,
    staleTime: 60_000,
  })
}

/** Returns a callback that invalidates the modules cache, triggering a re-fetch. */
export function useRefreshModules(): () => void {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['modules'] })
}
