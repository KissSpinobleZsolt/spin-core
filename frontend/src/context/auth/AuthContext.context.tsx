import type { ReactNode } from 'react'
import { useAuthStore } from '@store'

// AuthProvider is now a no-op passthrough — auth state lives in useAuthStore (Zustand).
// Kept so main.tsx import doesn't break during the transition.
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Returns the current authenticated user and auth actions. Delegates to useAuthStore. */
export function useAuth() {
  return useAuthStore()
}
