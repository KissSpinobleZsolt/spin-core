/** Aggregated log summary row keyed by time bucket, path, and status code. */
export interface SummaryEntry {
  bucket: string
  event_type: string
  path: string
  status_code: number
  request_count: number
  avg_duration_ms: number
  max_duration_ms: number
  error_count: number
}
