import { apiService } from './apiService'

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const themeService = {
  setTheme(theme: 'dark' | 'light'): Promise<void> {
    if (IS_MOCK) return Promise.resolve()
    return apiService.patch('/user/theme', { theme })
  },
}
