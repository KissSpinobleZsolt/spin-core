import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'

type RoleGuardProps = {
  requiredRoles: string[]
  fallback?: ReactNode
  children: ReactNode
}

export function RoleGuard({ requiredRoles, fallback = null, children }: RoleGuardProps) {
  const { user } = useAuth()
  const passes = user?.roles.some((r) => requiredRoles.includes(r)) ?? false
  return passes ? <>{children}</> : <>{fallback}</>
}
