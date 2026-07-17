import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { notificationService, type Notification } from '@services'
import { useAuth } from '@context/AuthContext'

type NotificationContextValue = {
  notifications: Notification[]
  unreadCount: number
  markAllRead: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
})

const MAX_BUFFERED = 100

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token') ?? ''
    notificationService.connect(token)

    const unsub = notificationService.subscribe((batch) => {
      setNotifications(prev => [...batch, ...prev].slice(0, MAX_BUFFERED))
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
