import { apiService } from '../api'

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** Fetches the dashboard welcome message. */
export const dashboardService = {
  getDashboard(): Promise<string> {
    if (IS_MOCK) return Promise.resolve('Hello welcome')
    return apiService.get<{ message: string }>('/dashboard').then(r => r.message)
  },
}
