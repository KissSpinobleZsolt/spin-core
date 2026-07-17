import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { settingsService } from '@services'
import { useAuth } from '../auth'
import type { ReachabilityMap } from './ReachabilityMap.type'
import type { SettingsContextValue } from './SettingsContextValue.type'
import { probeModule } from './probeModule'

const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Fetches and caches the registered module list, re-fetching when the current user changes. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [modules, setModules] = useState<SettingsContextValue['modules']>([])
  const [moduleReachability, setModuleReachability] = useState<ReachabilityMap>({})

  const refreshModules = useCallback(async () => {
    if (!user) return
    try {
      const mods = await settingsService.getModules()
      setModules(mods)
      // Probe all modules in parallel; update reachability map as results arrive
      const results = await Promise.allSettled(mods.map(probeModule))
      const map: ReachabilityMap = {}
      results.forEach((r, i) => {
        map[mods[i].id] = r.status === 'fulfilled' ? r.value : false
      })
      setModuleReachability(map)
    } catch {
      setModules([]) // Non-admins get 403 — leave modules empty
    }
  }, [user])

  useEffect(() => {
    refreshModules()
  }, [refreshModules])

  return (
    <SettingsContext.Provider value={{ modules, moduleReachability, refreshModules }}>
      {children}
    </SettingsContext.Provider>
  )
}

/** Returns the registered modules list and a refresh callback; must be inside SettingsProvider. */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
