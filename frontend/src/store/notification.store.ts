import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { notificationService } from '@services'
import type { Notification } from '@services'

const MAX_BUFFERED = 100  // cap in-memory list to avoid unbounded growth

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  _unsubscribe: (() => void) | null
  markAllRead: () => void
  connect: (token: string) => void
  disconnect: () => void
}

export const useNotificationStore = create<NotificationState>()(devtools((set, get) => ({
  notifications: [],
  unreadCount: 0,
  _unsubscribe: null,

  markAllRead() {
    set({ unreadCount: 0 }, false, 'notifications/markAllRead')
  },

  connect(token: string) {
    get()._unsubscribe?.()  // clean up any previous subscription before re-connecting

    notificationService.connect(token)

    const unsub = notificationService.subscribe(batch => {
      set(s => ({
        notifications: [...batch, ...s.notifications].slice(0, MAX_BUFFERED),
        unreadCount: s.unreadCount + batch.length,
      }), false, 'notifications/receive')
    })

    set({ _unsubscribe: unsub }, false, 'notifications/connect')
  },

  disconnect() {
    get()._unsubscribe?.()
    notificationService.disconnect()
    set({ notifications: [], unreadCount: 0, _unsubscribe: null }, false, 'notifications/disconnect')
  },
}), { name: 'NotificationStore' }))
