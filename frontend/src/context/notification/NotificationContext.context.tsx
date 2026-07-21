import type { ReactNode } from 'react'
import { useNotificationStore } from '@store'
import type { NotificationContextValue } from './NotificationContextValue.type'

// NotificationProvider is now a no-op passthrough — state lives in useNotificationStore (Zustand).
// The WebSocket is opened by useBootstrap() in AuthGuard after login.
export function NotificationProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Returns notification list, unread count, and markAllRead action. Delegates to useNotificationStore. */
export function useNotifications(): NotificationContextValue {
  const notifications = useNotificationStore(s => s.notifications)
  const unreadCount = useNotificationStore(s => s.unreadCount)
  const markAllRead = useNotificationStore(s => s.markAllRead)
  return { notifications, unreadCount, markAllRead }
}
