import type { ModuleConfig } from '@services'

// Default empty payload used when opening the Add module modal
export const BLANK: Omit<ModuleConfig, 'id'> = {
  name: '',
  description: '',
  remote_url: '',
  scope: '',
  component: './App',       // standard Webpack Module Federation exposed component path
  route: '',
  icon: '🧩',               // default icon for unbranded modules
  enabled: true,            // new modules are enabled by default
  roles: ['user', 'admin'], // grant access to all roles by default
  presets: { i18n: {}, layout: {}, settings: {} }, // empty presets; populated from manifest on save
}
