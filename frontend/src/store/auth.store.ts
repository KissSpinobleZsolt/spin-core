import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { authService } from '@services'
import type { AuthCredentials, AuthUser } from '@services'

interface AuthState {
  user: AuthUser | null
  login: (credentials: AuthCredentials) => Promise<void>
  logout: () => void
}

// Restore session from localStorage synchronously at module load — same as the previous AuthContext useState initialiser
export const useAuthStore = create<AuthState>()(devtools((set) => ({
  user: authService.getStoredUser(),

  async login(credentials) {
    const u = await authService.login(credentials)
    set({ user: u }, false, 'auth/login')
  },

  logout() {
    authService.logout()
    set({ user: null }, false, 'auth/logout')
  },
}), { name: 'AuthStore' }))
