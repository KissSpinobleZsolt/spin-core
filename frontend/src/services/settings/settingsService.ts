import { apiService } from '../api'
import type { DiscoveredModule } from './DiscoveredModule.type'
import type { ModuleConfig } from './ModuleConfig.type'
import type { ModuleInput } from './ModuleInput.type'
import { urlBuilder } from './urlBuilder'

/** CRUD operations for platform settings and module registry. */
export const settingsService = {
  async getModules(): Promise<ModuleConfig[]> {
    return apiService.get(urlBuilder()) // GET all registered modules
  },

  async createModule(m: ModuleInput): Promise<ModuleConfig> {
    return apiService.post(urlBuilder(), m) // POST new module registration
  },

  async updateModule(id: string, m: ModuleInput): Promise<ModuleConfig> {
    return apiService.put(urlBuilder(id), m) // PUT full module replacement by id
  },

  async deleteModule(id: string): Promise<void> {
    await apiService.delete(urlBuilder(id)) // DELETE module by id
  },

  async discoverModules(): Promise<DiscoveredModule[]> {
    return apiService.get(`${urlBuilder()}/discover`) // GET auto-discovery scan results
  },

  async resetModuleI18n(id: string): Promise<void> {
    await apiService.post(`${urlBuilder(id)}/reset-i18n`, {}) // POST to restore module's default i18n keys
  },
}
