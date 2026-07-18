import type { ModulePresets } from './ModulePresets.type'

/** Fields required to register or update a module in the database. */
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
  backend_url?: string
}
