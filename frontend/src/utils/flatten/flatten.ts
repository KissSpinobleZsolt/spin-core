/** Flatten a nested object to dot-notation keys: `{ nav: { home: "x" } }` → `{ "nav.home": "x" }` */
export function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k // Build dot-separated path
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, key)) // Recurse into nested objects
    } else {
      result[key] = String(v ?? '') // Coerce leaf values to string
    }
  }
  return result
}
