import { apiService } from '../api'
import { safeJsonParse } from '@utils'
import type { AuthCredentials } from './AuthCredentials.type'
import type { AuthUser } from './AuthUser.type'
import { BASE_PATH, IS_MOCK, USER_KEY, MOCK_USER } from './auth.constant'

/** Handles login, logout, and persisting the authenticated user in localStorage. */
export const authService = {
  async login(_credentials: AuthCredentials): Promise<AuthUser> {
    if (IS_MOCK) {
      localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER))
      return MOCK_USER
    }
    const { token, user } = await apiService.post<{ token: string; user: AuthUser }>(
      `/${BASE_PATH}/login`,
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
