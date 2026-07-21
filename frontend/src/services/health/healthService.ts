import type { HealthPayload } from './HealthPayload.type'

const TIMEOUT_MS = Number(import.meta.env.VITE_HEALTH_TIMEOUT_MS) || 5_000
const OFFLINE: HealthPayload = { api: false, postgres: false, clickhouse: false }

export const healthService = {
  /** Fetches health status from the API with a configurable timeout. */
  async fetch(): Promise<HealthPayload> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const res = await fetch('/api/health', { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) return OFFLINE
      const data: HealthPayload = await res.json()
      return { ...data, api: true }
    } catch {
      return OFFLINE
    }
  },

  /** @deprecated Use useHealthQuery instead. Spawns a background health-check worker. */
  startWorker(onUpdate: (payload: HealthPayload) => void): () => void {
    const worker = new Worker(
      new URL('./healthWorker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.onmessage = (e: MessageEvent<HealthPayload>) => onUpdate(e.data)
    return () => worker.terminate()
  },
}
