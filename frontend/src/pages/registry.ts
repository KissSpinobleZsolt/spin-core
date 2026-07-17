import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

// Maps component_key values stored in page_registry → lazy-loaded page components.
// Adding a new native page requires registering it here AND adding a DB seed row.
export const PAGE_REGISTRY: Record<string, LazyExoticComponent<ComponentType<object>>> = {
  Dashboard:       lazy(() => import('./Dashboard')),          // home dashboard (flat file)
  Logs:            lazy(() => import('./logs')),               // HTTP + chat logs page
  Translations:    lazy(() => import('./translations')),       // i18n key editor
  Bots:            lazy(() => import('./bots')),               // bot selection grid
  BotsAdmin:       lazy(() => import('./botsAdmin')),          // bot management admin page
  LLMs:            lazy(() => import('./admin/LLMs')),         // LLM model management (flat file)
  Users:           lazy(() => import('./admin/Users')),        // user management (flat file)
  Modules:         lazy(() => import('./admin/modules')),      // MF module management
  Status:          lazy(() => import('./admin/status')),       // platform health status
  Layouts:         lazy(() => import('./admin/layouts')),      // layout component demos
  DocsUI:          lazy(() => import('./admin/docs/ui')),      // UI component catalogue docs
  DocsApi:         lazy(() => import('./admin/docs/api')),     // API reference docs
  DocsDeployment:  lazy(() => import('./admin/docs/deployment')), // deployment guide docs
}
