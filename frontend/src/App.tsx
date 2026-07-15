import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Layout from './components/layout/Layout'
import { AuthGuard } from './components/guards/AuthGuard'
import { RoleGuard } from './components/guards/RoleGuard'
import { FederatedPage } from './components/modules/FederatedPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Logs from './pages/Logs'
import Translations from './pages/Translations'
import Bots from './pages/Bots'
import BotsAdmin from './pages/BotsAdmin'
import Chat from './pages/Chat'
import LLMs from './pages/admin/LLMs'
import Users from './pages/admin/Users'
import Modules from './pages/admin/Modules'
import Status from './pages/admin/Status'
import { useI18nSync } from './i18n/useI18nSync'
import { CookieConsentModal } from './components/CookieConsentModal'
import { Spinner } from './components/ui/Spinner'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          {
            path: 'logs',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Logs />
              </RoleGuard>
            ),
          },
          {
            path: 'translations',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Translations />
              </RoleGuard>
            ),
          },
          {
            path: 'bots-admin',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <BotsAdmin />
              </RoleGuard>
            ),
          },
          { path: 'bots', element: <Bots /> },
          { path: 'bots/:botId', element: <Chat /> },
          { path: 'modules/:moduleId', element: <FederatedPage /> },
          {
            path: 'admin/llms',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <LLMs />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/users',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Users />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/modules',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Modules />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/status',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Status />
              </RoleGuard>
            ),
          },
        ],
      },
    ],
  },
])

function App() {
  const i18nReady = useI18nSync()
  if (!i18nReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner size="lg" />
      </div>
    )
  }
  return (
    <>
      <RouterProvider router={router} />
      <CookieConsentModal />
    </>
  )
}

export default App
