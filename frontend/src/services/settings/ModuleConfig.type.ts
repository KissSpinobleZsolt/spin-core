import type { ModulePresets } from './ModulePresets.type'

/** Full module record as returned by the API, including its generated ID. */
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
  backend_url?: string
}
