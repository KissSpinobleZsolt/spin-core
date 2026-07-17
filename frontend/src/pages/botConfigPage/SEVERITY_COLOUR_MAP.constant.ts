// Class strings must be full literals so Tailwind includes them in the bundle
export const SEVERITY_COLOUR_MAP: Record<string, string> = {
  INFO:     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  WARNING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}
