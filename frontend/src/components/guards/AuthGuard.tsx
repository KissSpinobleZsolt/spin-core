import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function AuthGuard() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
