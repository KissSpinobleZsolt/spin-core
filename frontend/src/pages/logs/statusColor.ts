export function statusColor(code: number) { // returns Tailwind text colour class for HTTP status code
  if (code < 300) return 'text-green-600 dark:text-green-400' // 2xx success
  if (code < 400) return 'text-blue-600 dark:text-blue-400' // 3xx redirect
  if (code < 500) return 'text-yellow-600 dark:text-yellow-400' // 4xx client error
  return 'text-red-600 dark:text-red-400' // 5xx server error
}
