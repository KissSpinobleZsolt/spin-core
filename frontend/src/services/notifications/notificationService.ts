import type { Notification } from './types'

type Listener = (batch: Notification[]) => void

const WS_BASE = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api`
const RECONNECT_DELAY_MS = 3_000

class NotificationService {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = false
  private token = ''

  connect(token: string): void {
    this.token = token
    this.stopped = false
    this._open()
  }

  disconnect(): void {
    this.stopped = true
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private _open(): void {
    this.ws = new WebSocket(
      `${WS_BASE}/notifications/ws?token=${encodeURIComponent(this.token)}`,
    )

    this.ws.onmessage = (event) => {
      const batch = JSON.parse(event.data as string) as Notification[]
      this.listeners.forEach(l => l(batch))
    }

    this.ws.onerror = () => this.ws?.close()

    this.ws.onclose = () => {
      if (!this.stopped) {
        this.reconnectTimer = setTimeout(() => this._open(), RECONNECT_DELAY_MS)
      }
    }
  }
}

export const notificationService = new NotificationService()
