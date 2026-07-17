import { apiService } from '../api'
import type { PageConfig } from './types'

/** Lookup and manage page registry configs served from the DB. */
export const pagesService = {
  async getPageConfig(route: string): Promise<PageConfig> {
    return apiService.get<PageConfig>(`/pages/config?route=${encodeURIComponent(route)}`)
  },

  async patchPageConfig(route: string, data: Partial<Pick<PageConfig, 'title' | 'roles' | 'skeleton' | 'enabled'>>): Promise<PageConfig> {
    return apiService.patch<PageConfig>(`/pages/config?route=${encodeURIComponent(route)}`, data)
  },
}
