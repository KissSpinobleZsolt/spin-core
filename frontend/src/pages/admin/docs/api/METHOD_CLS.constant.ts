import type { Method } from './Method.type' // key type for the record

// Maps each HTTP method to its Tailwind colour classes for the method badge.
export const METHOD_CLS: Record<Method, string> = {
  GET:    'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400', // safe read operation
  POST:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400', // create operation
  PUT:    'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400', // full replace
  PATCH:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', // partial update
  DELETE: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400', // destructive operation
  '*':    'bg-slate-100  dark:bg-slate-700     text-slate-600  dark:text-slate-300', // wildcard / any method
}
