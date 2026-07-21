import { useUIStore } from '@store'
import type { ThemeContextValue } from './ThemeContextValue.type'

// ThemeProvider removed — theme state lives in useUIStore (ui.store.ts).
// useTheme() is kept as a thin adapter so existing consumers need no changes.

/** Returns the current theme and a setter that persists to localStorage and the backend. */
export function useTheme(): ThemeContextValue {
  const theme = useUIStore(s => s.theme)
  const setTheme = useUIStore(s => s.setTheme)
  return { theme, setTheme }
}
