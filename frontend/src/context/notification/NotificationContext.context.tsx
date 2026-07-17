import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { notificationService } from '@services'
import { useAuth } from '../auth'
import type { NotificationContextValue } from './NotificationContextValue.type'
import { MAX_BUFFERED } from './MAX_BUFFERED.constant'

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationContextValue['notifications']>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token') ?? ''
    notificationService.connect(token)

    const unsub = notificationService.subscribe((batch) => {
      setNotifications(prev => [...batch, ...prev].slice(0, MAX_BUFFERED)) // Cap list to avoid unbounded growth
      setUnreadCount(c => c + batch.length)
    })

    return () => {
      unsub()
      notificationService.disconnect()
    }
  }, [user])

  function markAllRead() {
    setUnreadCount(0)
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext)
}
