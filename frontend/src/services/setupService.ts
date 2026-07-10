import { apiService } from './apiService'

export type DbType = 'postgres' | 'mongodb' | 'clickhouse'
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
  db_type: DbType
  db_url: string
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

  async testConnection(db_type: DbType, db_url: string): Promise<{ ok: boolean; error?: string }> {
    return apiService.post('/setup/test-connection', { db_type, db_url })
  },

  async completeSetup(payload: SetupPayload): Promise<void> {
    await apiService.post('/setup/complete', payload)
  },
}
