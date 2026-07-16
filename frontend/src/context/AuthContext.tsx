import { createContext, useContext, useState, type ReactNode } from 'react'
import { authService, type AuthCredentials, type AuthUser } from '../services/authService'

type AuthContextValue = {
  user: AuthUser | null
  login(credentials: AuthCredentials): Promise<void>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Provides the authenticated user and login/logout actions to the component tree. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getStoredUser())

  async function login(credentials: AuthCredentials) {
    const u = await authService.login(credentials)
    setUser(u)
  }

  function logout() {
    authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Returns the current authenticated user and auth actions; must be inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
