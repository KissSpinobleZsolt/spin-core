import { apiService } from './apiService'

export type Theme = 'dark' | 'light'

export interface ModulePresets {
  i18n: Record<string, unknown>
  layout: Record<string, unknown>
  settings: Record<string, unknown>
}

export interface ModuleInput {
  name: string
  description: string
  remote_url: string
  scope: string
  component: string
  route: string
  icon: string
  enabled: boolean
  roles: string[]
  presets: ModulePresets
}

export interface ModuleConfig {
  id: string
  name: string
  description: string
  remote_url: string
  scope: string
  component: string
  route: string
  icon: string
  enabled: boolean
  roles: string[]
  presets: ModulePresets
}

export interface DiscoveredModule {
  source_url: string
  name?: string
  scope?: string
  component?: string
  route?: string
  icon?: string
  roles?: string[]
  description?: string
  remote_url?: string
  already_registered: boolean
  error?: string
}

export const settingsService = {
  async updateTheme(theme: Theme): Promise<void> {
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

  async discoverModules(): Promise<DiscoveredModule[]> {
    return apiService.get('/settings/modules/discover')
  },
}
