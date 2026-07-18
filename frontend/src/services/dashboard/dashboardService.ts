import { apiService } from '../api'
import { BASE_PATH, IS_MOCK } from './dashboard.constant'

/** Fetches the dashboard welcome message. */
export const dashboardService = {
  getDashboard(): Promise<string> {
    if (IS_MOCK) return Promise.resolve('Hello welcome')
    return apiService.get<{ message: string }>(`/${BASE_PATH}`).then(r => r.message)
  },
}
