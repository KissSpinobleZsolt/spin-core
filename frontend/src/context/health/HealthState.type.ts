import type { HealthPayload } from '@services'

/** HealthPayload extended with the timestamp of the most recent check. */
export type HealthState = HealthPayload & { checkedAt: Date | null }
