/** Base URL for API calls, stripped of trailing slash. */
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')
