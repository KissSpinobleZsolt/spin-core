import { useEffect, useRef, useState } from 'react'

export type ModelPhase = 'pending' | 'pulling' | 'verifying' | 'writing' | 'done' | 'error'

export type ProgressInfo = {
  phase: ModelPhase
  total_bytes: number
  completed_bytes: number
  percent: number
  speed_bps: number
  speed_str: string
  eta_str: string | null
}

export type ModelInfo = {
  model: string
  status: 'ready' | 'pending' | 'unknown' | 'pulling' | 'verifying' | 'writing' | 'error'
  size_bytes: number | null
  progress: ProgressInfo | null
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
          setTimeout(() => setDismissed(true), 4000)
        } else {
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
