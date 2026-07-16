import { apiService } from '../api'
import type { DiscoveredModule, ModuleConfig, ModuleInput } from './types'

/** CRUD operations for platform settings and module registry. */
export const settingsService = {
  async getModules(): Promise<ModuleConfig[]> {
    return apiService.get('/settings/modules')
  },

  async createModule(m: ModuleInput): Promise<ModuleConfig> {
    return apiService.post('/settings/modules', m)
  },

  async updateModule(id: string, m: ModuleInput): Promise<ModuleConfig> {
    return apiService.put(`/settings/modules/${id}`, m)
  },

  async deleteModule(id: string): Promise<void> {
    await apiService.delete(`/settings/modules/${id}`)
  },

  async discoverModules(): Promise<DiscoveredModule[]> {
    return apiService.get('/settings/modules/discover')
  },

  async resetModuleI18n(id: string): Promise<void> {
    await apiService.post(`/settings/modules/${id}/reset-i18n`, {})
  },
}
