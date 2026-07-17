/** Normalize an ISO timestamp to "YYYY-MM-DD HH:MM:SS" by replacing the T separator. */
export function formatEventTime(ts: string): string {
  return String(ts).replace('T', ' ').slice(0, 19)
}
