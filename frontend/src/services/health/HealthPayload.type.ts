/** Service health payload broadcast by the background health-check worker. */
export type HealthPayload = {
  api: boolean
  postgres: boolean
  clickhouse: boolean
  translations?: Record<string, string>
}
