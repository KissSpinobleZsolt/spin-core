import type { Auth } from './Auth.type' // key type for the record

// Maps each auth level to its Tailwind text-colour class for the auth badge.
export const AUTH_CLS: Record<Auth, string> = {
  Public: 'text-slate-400',                        // no token required
  Bearer: 'text-blue-500 dark:text-blue-400',      // any authenticated user
  Admin:  'text-red-500  dark:text-red-400',       // admin role required
}
