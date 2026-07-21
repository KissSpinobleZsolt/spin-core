import type { ReactNode } from 'react'
import { useUIStore } from '@store'
import type { UIPrefsContextValue } from './UIPrefsContextValue.type'

// UIPrefsProvider is now a no-op passthrough — prefs live in useUIStore (Zustand).
// Kept so AuthGuard import doesn't break during the transition.
export function UIPrefsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Returns sidebar collapsed state and toggle. Delegates to useUIStore. */
export function useUIPrefs(): UIPrefsContextValue {
  const sidebarCollapsed = useUIStore(s => s.sidebarCollapsed)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  return { sidebarCollapsed, toggleSidebar }
}
