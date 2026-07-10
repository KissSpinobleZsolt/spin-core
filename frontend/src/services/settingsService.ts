import { apiService } from './apiService'
import type { ModuleInput } from './setupService'

export type { Theme } from './setupService'

export interface ModuleConfig {
  id: string
  name: string
  remote_url: string
  scope: string
  component: string
  route: string
  icon: string
  enabled: boolean
  roles: string[]
}

export interface AppSettings {
  setup_complete: boolean
  theme: { default_theme: string }
  modules: ModuleConfig[]
}

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    return apiService.get('/settings')
  },

  async updateTheme(theme: 'dark' | 'light'): Promise<void> {
    await apiService.patch('/settings/theme', { theme })
  },

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
}
