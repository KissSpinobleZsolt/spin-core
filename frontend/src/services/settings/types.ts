/** Active UI theme. */
export type Theme = 'dark' | 'light'

/** Preset configuration buckets injected into a federated module as props. */
export interface ModulePresets {
  /** Locale key-value overrides passed to the module's i18n layer. */
  i18n: Record<string, unknown>
  /** Layout hints passed to the module's layout system. */
  layout: Record<string, unknown>
  /** Arbitrary module-specific settings key-value pairs. */
  settings: Record<string, unknown>
}

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

/** Module candidate discovered from a registry URL, before being formally registered. */
export interface DiscoveredModule {
  /** Registry URL from which this module candidate was discovered. */
  source_url: string
  name?: string
  scope?: string
  component?: string
  route?: string
  icon?: string
  roles?: string[]
  description?: string
  remote_url?: string
  /** True when this module scope already exists in the database. */
  already_registered: boolean
  /** Set when already_registered=true — the DB row's id, used to enable a disabled module. */
  module_id?: string
  /** Set when already_registered=true — whether the existing module is currently enabled. */
  enabled?: boolean
}
