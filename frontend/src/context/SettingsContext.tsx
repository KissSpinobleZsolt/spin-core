import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { settingsService, type ModuleConfig } from '@services'
import { useAuth } from './AuthContext'

type ReachabilityMap = Record<string, boolean>

interface SettingsContextValue {
  modules: ModuleConfig[]
  /** module ID → true/false; absent means not yet probed */
  moduleReachability: ReachabilityMap
  refreshModules: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

async function probeModule(m: ModuleConfig): Promise<boolean> {
  try {
    const base = m.remote_url.replace(/\/remoteEntry\.js$/, '').replace(/\/$/, '')
    const resp = await fetch(`${base}/manifest.json`, {
      method: 'HEAD',
      // 3 s is enough to distinguish "container down" from "slow network"
      signal: AbortSignal.timeout(3000),
    })
    return resp.ok
  } catch {
    return false
  }
}

/** Fetches and caches the registered module list, re-fetching when the current user changes. */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [modules, setModules] = useState<ModuleConfig[]>([])
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
      // non-admins get 403 — leave modules empty
      setModules([])
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
