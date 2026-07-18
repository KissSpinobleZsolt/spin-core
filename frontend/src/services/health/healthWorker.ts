import type { HealthPayload } from './HealthPayload.type'

// || not ?? — Number(undefined) is NaN, which is falsy; ?? would keep NaN because it is not null/undefined
const INTERVAL_MS = Number(import.meta.env.VITE_HEALTH_INTERVAL_MS) || 30_000
const TIMEOUT_MS  = Number(import.meta.env.VITE_HEALTH_TIMEOUT_MS)  || 5_000

const OFFLINE: HealthPayload = { api: false, postgres: false, clickhouse: false }

async function ping() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch('/api/health', { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) { self.postMessage(OFFLINE); return }
    const data: HealthPayload = await res.json()
    self.postMessage({ ...data, api: true })
  } catch {
    self.postMessage(OFFLINE)
  }
}

ping()
setInterval(ping, INTERVAL_MS)
