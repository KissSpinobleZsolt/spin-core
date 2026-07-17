import type { ModelStatusPayload } from '@hooks'

/** Shape of the value exposed by ModelStatusContext. */
export interface ModelStatusContextValue {
  status: ModelStatusPayload | null
  dismissed: boolean
  dismiss: () => void
}
