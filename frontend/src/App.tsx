import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Layout from './components/layout/Layout'
import { AuthGuard } from './components/guards/AuthGuard'
import { SetupGuard } from './components/guards/SetupGuard'
import { RoleGuard } from './components/guards/RoleGuard'
import { FederatedPage } from './components/modules/FederatedPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Settings from './pages/Settings'

const router = createBrowserRouter([
  {
    path: '/setup',
    element: (
      <SetupGuard>
        <Setup />
      </SetupGuard>
    ),
  },
  {
    path: '/login',
    element: (
      <SetupGuard>
        <Login />
      </SetupGuard>
    ),
  },
  {
    element: (
      <SetupGuard>
        <AuthGuard />
      </SetupGuard>
    ),
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
          { path: 'modules/:moduleId', element: <FederatedPage /> },
        ],
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
