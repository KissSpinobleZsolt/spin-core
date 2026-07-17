/** Unflatten dot-notation keys back to a nested object: `{ "nav.home": "x" }` → `{ nav: { home: "x" } }` */
export function unflatten(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.') // Split dot path into segments
    let cur = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) {
        cur[parts[i]] = {} // Create intermediate nodes as needed
      }
      cur = cur[parts[i]] as Record<string, unknown>
    }
    cur[parts[parts.length - 1]] = value // Assign leaf value
  }
  return result
}
