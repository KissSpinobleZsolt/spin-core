import { apiService } from '../api'
import { BASE_PATH, IS_MOCK } from './theme.constant'

/** Persists the user's active theme preference to the backend. */
export const themeService = {
  setTheme(theme: 'dark' | 'light'): Promise<void> {
    if (IS_MOCK) return Promise.resolve()
    return apiService.patch(`/${BASE_PATH}/theme`, { theme })
  },
}
