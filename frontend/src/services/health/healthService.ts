import type { HealthPayload } from './types'

/** Spawns a background health-check worker and returns a cleanup function that terminates it. */
export const healthService = {
  // Returns the terminate function directly so React useEffect can use it as a cleanup without a wrapper
  startWorker(onUpdate: (payload: HealthPayload) => void): () => void {
    const worker = new Worker(
      new URL('./healthWorker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.onmessage = (e: MessageEvent<HealthPayload>) => onUpdate(e.data)
    return () => worker.terminate()
  },
}
