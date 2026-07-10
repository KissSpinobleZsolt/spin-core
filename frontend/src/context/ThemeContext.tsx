import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { themeService } from '../services/themeService'

type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: Theme
  setTheme(theme: Theme): void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    return stored ?? user?.defaultTheme ?? 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
