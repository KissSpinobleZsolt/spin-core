import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { themeService } from '@services'

type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: Theme
  setTheme(theme: Theme): void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Persists, syncs across tabs, and applies the active UI theme to the document element. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    return stored ?? user?.defaultTheme ?? 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
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
    themeService.setTheme(next).catch(() => {})
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
