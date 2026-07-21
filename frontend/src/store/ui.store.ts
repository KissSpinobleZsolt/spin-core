import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { safeJsonParse } from '@utils'
import { themeService } from '@services'
import type { Theme } from '@context'

const THEME_KEY = 'theme'
const PREFS_KEY = 'ui_prefs'

interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  setTheme: (t: Theme) => void         // persist to localStorage + backend
  applyTheme: (t: Theme) => void       // set localStorage + DOM class only
  initFromUser: (defaultTheme?: Theme) => void  // apply server preference on login
  toggleSidebar: () => void
}

// Read both values synchronously at module load to avoid flash on first paint
const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null
const initialTheme: Theme = storedTheme ?? 'light'
document.documentElement.classList.toggle('dark', initialTheme === 'dark')  // apply before React paints

const storedPrefs = safeJsonParse<{ sidebarCollapsed?: boolean }>(
  localStorage.getItem(PREFS_KEY),
  {},
)

export const useUIStore = create<UIState>()(devtools((set, get) => ({
  theme: initialTheme,
  sidebarCollapsed: storedPrefs.sidebarCollapsed ?? false,

  applyTheme(next: Theme) {
    localStorage.setItem(THEME_KEY, next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    set({ theme: next }, false, 'ui/applyTheme')
  },

  setTheme(next: Theme) {
    get().applyTheme(next)
    themeService.setTheme(next).catch(() => {})  // fire-and-forget; local state already updated
  },

  initFromUser(defaultTheme?: Theme) {
    // Only honour the server default when no local override exists
    if (!localStorage.getItem(THEME_KEY) && defaultTheme) {
      get().applyTheme(defaultTheme)
    }
  },

  toggleSidebar() {
    set(s => {
      const next = { sidebarCollapsed: !s.sidebarCollapsed }
      localStorage.setItem(PREFS_KEY, JSON.stringify({ sidebarCollapsed: next.sidebarCollapsed }))
      return next
    }, false, 'ui/toggleSidebar')
  },
}), { name: 'UIStore' }))

// Cross-tab sync for both theme and sidebar pref
window.addEventListener('storage', (e: StorageEvent) => {
  if (e.key === THEME_KEY && (e.newValue === 'dark' || e.newValue === 'light')) {
    useUIStore.getState().applyTheme(e.newValue)
  }
  if (e.key === PREFS_KEY && e.newValue) {
    const parsed = safeJsonParse<{ sidebarCollapsed?: boolean }>(e.newValue, {})
    if (parsed.sidebarCollapsed !== undefined) {
      useUIStore.setState({ sidebarCollapsed: parsed.sidebarCollapsed })
    }
  }
})
