import { apiService } from '../api'
import type { PageConfig } from './types'

/** Lookup and manage page registry configs served from the DB. */
export const pagesService = {
  async listPages(): Promise<PageConfig[]> {
    return apiService.get<PageConfig[]>('/pages')  // admin-only endpoint; returns all page_registry rows ordered by route
  },

  async getPageConfig(route: string): Promise<PageConfig> {
    return apiService.get<PageConfig>(`/pages/config?route=${encodeURIComponent(route)}`)  // encodeURIComponent handles routes with slashes
  },

  async patchPageConfig(route: string, data: Partial<Pick<PageConfig, 'title' | 'roles' | 'skeleton' | 'enabled'>>): Promise<PageConfig> {
    return apiService.patch<PageConfig>(`/pages/config?route=${encodeURIComponent(route)}`, data)  // PATCH so only supplied fields are overwritten
  },
}
