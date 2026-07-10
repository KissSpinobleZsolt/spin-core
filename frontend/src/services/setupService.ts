import { apiService } from './apiService'

export type Theme = 'dark' | 'light'

export interface ModuleInput {
  name: string
  remote_url: string
  scope: string
  component: string
  route: string
  icon: string
  enabled: boolean
  roles: string[]
}

export interface SetupPayload {
  admin_name: string
  admin_email: string
  admin_password: string
  default_theme: Theme
  modules: ModuleInput[]
}

export const setupService = {
  async getStatus(): Promise<{ setup_complete: boolean }> {
    return apiService.get('/setup/status')
  },

  async completeSetup(payload: SetupPayload): Promise<void> {
    await apiService.post('/setup/complete', payload)
  },
}
