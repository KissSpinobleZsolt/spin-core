import { lazy } from 'react' // React.lazy wraps dynamic imports for code-splitting

export const Dashboard    = lazy(() => import('../../pages/Dashboard'))        // home dashboard page
export const Login        = lazy(() => import('../../pages/Login'))            // login screen (outside layout)
export const Translations = lazy(() => import('../../pages/translations'))     // i18n key editor
export const Bots         = lazy(() => import('../../pages/bots'))             // bot selection grid
export const Chat         = lazy(() => import('../../pages/chat'))             // bot chat with config panel
export const LLMs         = lazy(() => import('../../pages/admin/LLMs'))       // LLM model management
export const Users        = lazy(() => import('../../pages/admin/Users'))      // user management
export const Modules      = lazy(() => import('../../pages/modules'))          // MF module management
export const ModuleDetail = lazy(() => import('../../pages/modules/ModuleDetail')) // single module detail + config
export const BotDetail    = lazy(() => import('../../pages/botsAdmin/BotDetail'))  // single bot detail + edit
export const Status       = lazy(() => import('../../pages/status'))           // platform health status
export const NotFound     = lazy(() => import('../../pages/NotFound'))         // 404 catch-all page
