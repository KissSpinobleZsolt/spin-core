import { useEffect, useRef, useState } from 'react'

export type ModelInfo = {
  model: string
  status: 'ready' | 'pending' | 'unknown'
  size_bytes: number | null
}

export type ModelStatusPayload = {
  ollama: 'ok' | 'unreachable'
  all_ready: boolean
  models: ModelInfo[]
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatusPayload | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const everNotReady = useRef(false)

  useEffect(() => {
    const es = new EventSource(`${BASE_URL}/model-status/stream`)

    es.onmessage = (e: MessageEvent) => {
      const data: ModelStatusPayload = JSON.parse(e.data)

      if (!data.all_ready) everNotReady.current = true

      setStatus(data)

      if (data.all_ready) {
        es.close()
        if (everNotReady.current) {
          // was downloading — show success briefly then dismiss
          setTimeout(() => setDismissed(true), 4000)
        } else {
          // already ready on first event — never show the banner
          setDismissed(true)
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
