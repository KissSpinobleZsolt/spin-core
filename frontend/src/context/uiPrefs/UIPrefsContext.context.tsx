import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { safeJsonParse } from '@utils'
import type { UIPrefs } from './UIPrefs.type'
import type { UIPrefsContextValue } from './UIPrefsContextValue.type'
import { STORAGE_KEY } from './STORAGE_KEY.constant'
import { loadPrefs } from './loadPrefs'
import { savePrefs } from './savePrefs'

const UIPrefsContext = createContext<UIPrefsContextValue | null>(null)

/** Persists UI preferences in localStorage and syncs changes across tabs. */
export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPrefs>(loadPrefs) // Load initial state from localStorage

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        setPrefs(prev => ({ ...prev, ...safeJsonParse<Partial<UIPrefs>>(e.newValue, {}) }))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggleSidebar = useCallback(() => {
    setPrefs(prev => {
      const next = { ...prev, sidebarCollapsed: !prev.sidebarCollapsed }
      savePrefs(next)
      return next
    })
  }, [])

  return (
    <UIPrefsContext.Provider value={{ sidebarCollapsed: prefs.sidebarCollapsed, toggleSidebar }}>
      {children}
    </UIPrefsContext.Provider>
  )
}

/** Returns UI preference values and mutators; must be inside UIPrefsProvider. */
export function useUIPrefs(): UIPrefsContextValue {
  const ctx = useContext(UIPrefsContext)
  if (!ctx) throw new Error('useUIPrefs must be used inside UIPrefsProvider')
  return ctx
}
