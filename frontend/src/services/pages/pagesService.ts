import { apiService } from '../api'
import type { PageConfig } from './PageConfig.type'

const BASE_PATH = 'pages' // root segment for all page registry endpoints

/** Lookup and manage page registry configs served from the DB. */
export const pagesService = {
  async listPages(): Promise<PageConfig[]> {
    return apiService.get<PageConfig[]>(`/${BASE_PATH}`)  // admin-only endpoint; returns all page_registry rows ordered by route
  },

  async getPageConfig(route: string): Promise<PageConfig> {
    return apiService.get<PageConfig>(`/${BASE_PATH}/config?route=${encodeURIComponent(route)}`)  // encodeURIComponent handles routes with slashes
  },

  async patchPageConfig(route: string, data: Partial<Pick<PageConfig, 'title' | 'roles' | 'skeleton' | 'enabled'>>): Promise<PageConfig> {
    return apiService.patch<PageConfig>(`/${BASE_PATH}/config?route=${encodeURIComponent(route)}`, data)  // PATCH so only supplied fields are overwritten
  },
}
