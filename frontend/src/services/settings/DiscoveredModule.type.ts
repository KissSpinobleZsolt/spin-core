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
