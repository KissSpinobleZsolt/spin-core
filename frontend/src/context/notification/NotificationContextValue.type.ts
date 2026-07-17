import type { Notification } from '@services'

/** Shape of the value exposed by NotificationContext. */
export type NotificationContextValue = {
  notifications: Notification[]
  unreadCount: number
  markAllRead: () => void
}
