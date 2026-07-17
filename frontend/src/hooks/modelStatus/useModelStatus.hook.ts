import { useEffect, useRef, useState } from 'react'
import { BASE_URL } from './BASE_URL.constant'
import type { ModelStatusPayload } from './ModelStatusPayload.type'

/** Subscribes to the model-status SSE stream and auto-dismisses once all models are ready. */
export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatusPayload | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const everNotReady = useRef(false) // Tracks whether any not-ready state was seen — delays auto-dismiss

  useEffect(() => {
    const es = new EventSource(`${BASE_URL}/model-status/stream`)

    es.onmessage = (e: MessageEvent) => {
      const data: ModelStatusPayload = JSON.parse(e.data)

      if (!data.all_ready) everNotReady.current = true

      setStatus(data)

      if (data.all_ready) {
        es.close()
        if (everNotReady.current) {
          setTimeout(() => setDismissed(true), 4000) // Brief delay so user sees the "ready" state
        } else {
          setDismissed(true) // Never showed a loading state — hide immediately
        }
      }
    }

    es.onerror = () => {
      // EventSource auto-reconnects; no manual handling needed
    }

    return () => es.close()
  }, [])

  return { status, dismissed, dismiss: () => setDismissed(true) }
}
