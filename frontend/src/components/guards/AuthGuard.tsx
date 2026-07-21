import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@store'
import { useBootstrap } from '@hooks'

export function AuthGuard() {
  const user = useAuthStore(s => s.user)
  useBootstrap()  // single coordinator: opens WS/SSE, applies theme, tears down on logout
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
