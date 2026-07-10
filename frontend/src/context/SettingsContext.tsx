import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { settingsService, type ModuleConfig } from '../services/settingsService'
import { useAuth } from './AuthContext'

interface SettingsContextValue {
  modules: ModuleConfig[]
  refreshModules: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [modules, setModules] = useState<ModuleConfig[]>([])

  const refreshModules = useCallback(async () => {
    if (!user) return
    try {
      const mods = await settingsService.getModules()
      setModules(mods)
    } catch {
      // non-admins get 403 — leave modules empty
      setModules([])
    }
  }, [user])

  useEffect(() => {
    refreshModules()
  }, [refreshModules])

  return (
    <SettingsContext.Provider value={{ modules, refreshModules }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
