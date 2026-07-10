import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

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
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

function save(prefs: UIPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPrefs>(load)

  // Keep in sync across browser tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setPrefs(prev => ({ ...prev, ...JSON.parse(e.newValue!) }))
        } catch {}
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

export function useUIPrefs(): UIPrefsContextValue {
  const ctx = useContext(UIPrefsContext)
  if (!ctx) throw new Error('useUIPrefs must be used inside UIPrefsProvider')
  return ctx
}
