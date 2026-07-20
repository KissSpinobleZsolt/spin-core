import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

// Maps component_key values stored in page_registry → lazy-loaded page components.
// Adding a new native page requires registering it here AND adding a DB seed row.
export const PAGE_REGISTRY: Record<string, LazyExoticComponent<ComponentType<object>>> = {
  Dashboard:    lazy(() => import('./Dashboard')),      // home dashboard (flat file)
  Logs:         lazy(() => import('./logs')),           // HTTP + chat logs page
  Translations: lazy(() => import('./translations')),   // i18n key editor
  Bots:         lazy(() => import('./bots')),           // bot selection grid
  BotsAdmin:    lazy(() => import('./botsAdmin')),      // bot management admin page
  LLMs:         lazy(() => import('./admin/LLMs')),     // LLM model management (flat file)
  Users:        lazy(() => import('./admin/Users')),    // user management (flat file)
  Modules:      lazy(() => import('./modules')),        // MF module management
  Status:       lazy(() => import('./status')),         // platform health status
  Layouts:      lazy(() => import('./layouts')),        // layout component demos
}
