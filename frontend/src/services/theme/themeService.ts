import { apiService } from '../api'

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** Persists the user's active theme preference to the backend. */
export const themeService = {
  setTheme(theme: 'dark' | 'light'): Promise<void> {
    if (IS_MOCK) return Promise.resolve()
    return apiService.patch('/user/theme', { theme })
  },
}
