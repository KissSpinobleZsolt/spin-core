import { create } from 'zustand'
import { themeService } from '@services'
import type { Theme } from '@context'

interface ThemeStore {
  theme: Theme
  setTheme: (t: Theme) => void          // persists to localStorage + backend
  applyTheme: (t: Theme) => void        // sets localStorage + DOM class, no backend call
  initFromUser: (defaultTheme?: Theme) => void  // applies server preference on first login
}

// Read initial theme from localStorage before the store is created to avoid a flash of wrong theme
const storedTheme = localStorage.getItem('theme') as Theme | null
const initialTheme: Theme = storedTheme ?? 'light'  // fall back to light when nothing is stored
document.documentElement.classList.toggle('dark', initialTheme === 'dark')  // apply immediately before first React paint

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,  // seed store from the same value already applied to the DOM

  applyTheme(next: Theme) {
    localStorage.setItem('theme', next)  // persist so the value survives a page refresh
    document.documentElement.classList.toggle('dark', next === 'dark')  // sync Tailwind dark class on root element
    set({ theme: next })  // update store so all subscribers re-render
  },

  setTheme(next: Theme) {
    get().applyTheme(next)  // apply locally first so the UI responds immediately
    themeService.setTheme(next).catch(() => {})  // fire-and-forget; local state already updated above
  },

  initFromUser(defaultTheme?: Theme) {
    if (!localStorage.getItem('theme') && defaultTheme) {
      get().applyTheme(defaultTheme)  // only honour the server default when no local override exists
    }
  },
}))

// Wire cross-tab sync at module level — runs once when the module is first imported
window.addEventListener('storage', (e: StorageEvent) => {
  if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
    useThemeStore.getState().applyTheme(e.newValue)  // mirror the other tab's choice; it already wrote to localStorage
  }
})
