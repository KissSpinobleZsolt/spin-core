import { useEffect, useRef } from 'react'
import { useAuthStore, useUIStore, useModelStatusStore, useNotificationStore } from '@store'
import type { AuthUser } from '@services'

/**
 * Single post-login bootstrap coordinator. Call once in AuthGuard.
 * Detects the null→non-null user transition and fires all init logic in one place,
 * replacing the 4 scattered useEffect([user]) calls that previously lived in:
 *   - SettingsContext (modules fetch)   → now TQ enabled:!!user, fires automatically
 *   - NotificationContext (WebSocket)   → useNotificationStore.connect()
 *   - useI18nSync (translation reload)  → Layout always mounts post-auth; initial load is enough
 *   - Layout (theme initFromUser)       → useUIStore.initFromUser()
 * On logout, tears down all open connections.
 */
export function useBootstrap() {
  const user = useAuthStore(s => s.user)
  const prevRef = useRef<AuthUser | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = user

    if (user && !prev) {
      // Login event — coordinate all post-login init in explicit order
      useUIStore.getState().initFromUser(user.defaultTheme)  // theme first — prevents flash before render
      useNotificationStore.getState().connect(localStorage.getItem('token') ?? '')
      useModelStatusStore.getState().connect()
      // Health and modules are TQ queries with enabled:!!user — they fire automatically
    }

    if (!user && prev) {
      // Logout event — tear down all active connections
      useNotificationStore.getState().disconnect()
      useModelStatusStore.getState().disconnect()
    }
  }, [user])
}
