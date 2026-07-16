import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { HealthPayload } from '../workers/healthWorker'

/** HealthPayload extended with the timestamp of the most recent check. */
export type HealthState = HealthPayload & { checkedAt: Date | null }

const DEFAULT: HealthState = {
  api: true,
  postgres: true,
  clickhouse: true,
  checkedAt: null,
}

const HealthContext = createContext<HealthState>(DEFAULT)

/** Runs a background health-check worker and provides real-time service status. */
export function HealthProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<HealthState>(DEFAULT)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/healthWorker.ts', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (e: MessageEvent<HealthPayload>) => {
      setHealth({ ...e.data, checkedAt: new Date() })
    }

    return () => worker.terminate()
  }, [])

  return <HealthContext.Provider value={health}>{children}</HealthContext.Provider>
}

/** Returns the latest service health state; must be inside HealthProvider. */
export function useHealth(): HealthState {
  return useContext(HealthContext)
}
