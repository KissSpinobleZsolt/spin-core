import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { safeJsonParse } from '@utils'

interface UIPrefs {
  sidebarCollapsed: boolean
}

interface UIPrefsContextValue {
  sidebarCollapsed: boolean
  toggleSidebar(): void
}

const STORAGE_KEY = 'ui_prefs'
const DEFAULT: UIPrefs = { sidebarCollapsed: false }

const UIPrefsContext = createContext<UIPrefsContextValue | null>(null)

function load(): UIPrefs {
  return { ...DEFAULT, ...safeJsonParse<Partial<UIPrefs>>(localStorage.getItem(STORAGE_KEY), {}) }
}

function save(prefs: UIPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

/** Persists UI preferences in localStorage and syncs changes across tabs. */
export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPrefs>(load)

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
      save(next)
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
