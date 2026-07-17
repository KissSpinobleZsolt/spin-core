import { useAuth } from '@context'
import type { RoleGuardProps } from './RoleGuardProps.type'

export function RoleGuard({ requiredRoles, fallback = null, children }: RoleGuardProps) {
  const { user } = useAuth()
  const passes = user?.roles.some((r) => requiredRoles.includes(r)) ?? false // Allow if any user role matches
  return passes ? <>{children}</> : <>{fallback}</>
}
