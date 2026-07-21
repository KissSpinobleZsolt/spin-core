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
  configuration_raw?: Record<string, unknown> | null  // raw manifest snapshot stored at registration time
  /** Current responsible party; 'system' for seeded modules. */
  owner?: string
  /** Immutable creator identity. */
  created_by?: string
  /** Email of the admin who last edited this module; null until first explicit edit. */
  updated_by?: string | null
  /** Server-set creation timestamp. */
  created_on?: string | null
  /** Null until the first explicit edit. */
  updated_on?: string | null
}
