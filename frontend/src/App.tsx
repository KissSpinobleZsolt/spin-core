import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Layout from './components/layout/Layout'
import { AuthGuard } from './components/guards/AuthGuard'
import { RoleGuard } from './components/guards/RoleGuard'
import { FederatedPage } from './components/modules/FederatedPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Logs from './pages/Logs'
import Translations from './pages/Translations'
import { useI18nSync } from './i18n/useI18nSync'

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
            path: 'settings',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Settings />
              </RoleGuard>
            ),
          },
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
          { path: 'modules/:moduleId', element: <FederatedPage /> },
        ],
      },
    ],
  },
])

function App() {
  useI18nSync()
  return <RouterProvider router={router} />
}

export default App
