const INTERVAL_MS = 30_000
const TIMEOUT_MS = 5_000

const OFFLINE: HealthPayload = { api: false, postgres: false, clickhouse: false }

export type HealthPayload = {
  api: boolean
  postgres: boolean
  clickhouse: boolean
  translations?: Record<string, string>
}

async function ping() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch('/api/health', { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      self.postMessage(OFFLINE)
      return
    }
    const data: HealthPayload = await res.json()
    self.postMessage({ ...data, api: true })
  } catch {
    self.postMessage(OFFLINE)
  }
}

ping()
setInterval(ping, INTERVAL_MS)
