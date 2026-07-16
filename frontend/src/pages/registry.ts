import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

// Maps component_key values stored in page_registry → lazy-loaded page components.
// Adding a new native page requires registering it here AND adding a DB seed row.
export const PAGE_REGISTRY: Record<string, LazyExoticComponent<ComponentType<object>>> = {
  Dashboard:       lazy(() => import('./Dashboard')),
  Logs:            lazy(() => import('./Logs')),
  Translations:    lazy(() => import('./Translations')),
  Bots:            lazy(() => import('./Bots')),
  BotsAdmin:       lazy(() => import('./BotsAdmin')),
  LLMs:            lazy(() => import('./admin/LLMs')),
  Users:           lazy(() => import('./admin/Users')),
  Modules:         lazy(() => import('./admin/Modules')),
  Status:          lazy(() => import('./admin/Status')),
  Components:      lazy(() => import('./admin/Components')),
  Layouts:         lazy(() => import('./admin/Layouts')),
  DocsUI:          lazy(() => import('./admin/docs/UI')),
  DocsApi:         lazy(() => import('./admin/docs/Api')),
  DocsDeployment:  lazy(() => import('./admin/docs/Deployment')),
}
