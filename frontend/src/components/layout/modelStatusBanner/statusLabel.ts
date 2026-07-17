import type { ModelInfo } from '@hooks'

/** Return a human-readable label for a model's pull status. */
export function statusLabel(status: ModelInfo['status']): string {
  switch (status) {
    case 'pulling':   return 'downloading…'
    case 'verifying': return 'verifying…'
    case 'writing':   return 'writing…'
    case 'error':     return 'error'
    default:          return 'pending…'
  }
}
