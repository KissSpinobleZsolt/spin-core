import { apiService } from '../api'
import { safeJsonParse } from '@utils'
import type { AuthCredentials, AuthUser } from './types'

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const USER_KEY = 'auth_user'

const MOCK_USER: AuthUser = {
  name: 'User Doe',
  roles: ['user', 'admin'],
  defaultTheme: 'dark',
}

/** Handles login, logout, and persisting the authenticated user in localStorage. */
export const authService = {
  async login(_credentials: AuthCredentials): Promise<AuthUser> {
    if (IS_MOCK) {
      localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER))
      return MOCK_USER
    }
    const { token, user } = await apiService.post<{ token: string; user: AuthUser }>(
      '/auth/login',
      _credentials,
    )
    localStorage.setItem('token', token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return user
  },

  logout(): void {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('token')
  },

  getStoredUser(): AuthUser | null {
    return safeJsonParse<AuthUser | null>(localStorage.getItem(USER_KEY), null)
  },
}
