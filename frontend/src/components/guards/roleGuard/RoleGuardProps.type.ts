import type { ReactNode } from 'react'

/** Props for the RoleGuard component. */
export type RoleGuardProps = {
  requiredRoles: string[]
  fallback?: ReactNode
  children: ReactNode
}
