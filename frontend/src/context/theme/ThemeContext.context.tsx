import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { themeService } from '@services'
import type { Theme } from './Theme.type'
import type { ThemeContextValue } from './ThemeContextValue.type'

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Persists, syncs across tabs, and applies the active UI theme to the document element. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    return stored ?? user?.defaultTheme ?? 'light' // Prefer stored value, then user default, then light
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark') // Apply Tailwind dark class to root
  }, [theme])

  // Sync theme when it changes in another tab
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setThemeState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Apply user's defaultTheme on first login if no explicit preference is stored
  useEffect(() => {
    if (user?.defaultTheme && !localStorage.getItem('theme')) {
      applyTheme(user.defaultTheme)
    }
  }, [user])

  function applyTheme(next: Theme) {
    localStorage.setItem('theme', next)
    setThemeState(next)
  }

  function setTheme(next: Theme) {
    applyTheme(next)
    themeService.setTheme(next).catch(() => {}) // Fire-and-forget; local state already updated above
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Returns the current theme and a setter that persists to localStorage and the backend; must be inside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
