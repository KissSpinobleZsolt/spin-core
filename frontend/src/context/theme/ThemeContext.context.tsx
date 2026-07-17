import { useThemeStore } from '@store'
import type { ThemeContextValue } from './ThemeContextValue.type'

// ThemeProvider removed — theme state is now a Zustand store (src/store/theme.store.ts).
// useTheme() is kept here as a thin adapter so existing consumers (Header, etc.) need no changes.

/** Returns the current theme and a setter that persists to localStorage and the backend. */
export function useTheme(): ThemeContextValue {
  const theme = useThemeStore(s => s.theme)        // subscribe to theme slice only; re-renders when theme changes
  const setTheme = useThemeStore(s => s.setTheme)  // stable function reference; subscribing separately avoids an object allocation per render
  return { theme, setTheme }
}
