import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { AuthGuard } from '../components/guards/AuthGuard'
import { RoleGuard } from '../components/guards/RoleGuard'
import { FederatedPage } from '../components/modules/FederatedPage'
import { PageLoader } from '../components/layout/PageLoader'
import { UIComponentsProvider } from '@context'
import { loginFallback } from './loginFallback.constant'

const Dashboard      = lazy(() => import('../pages/Dashboard')) // code-split per route
const Login          = lazy(() => import('../pages/Login'))
const Translations   = lazy(() => import('../pages/translations'))
const Bots           = lazy(() => import('../pages/Bots'))
const Chat           = lazy(() => import('../pages/Chat'))
const LLMs           = lazy(() => import('../pages/admin/LLMs'))
const Users          = lazy(() => import('../pages/admin/Users'))
const Modules        = lazy(() => import('../pages/admin/Modules'))
const Status         = lazy(() => import('../pages/admin/Status'))
const Layouts        = lazy(() => import('../pages/admin/Layouts'))
const DocsUI         = lazy(() => import('../pages/admin/docs/UI'))
const DocsApi        = lazy(() => import('../pages/admin/docs/Api'))
const DocsDeployment = lazy(() => import('../pages/admin/docs/Deployment'))
const NotFound       = lazy(() => import('../pages/NotFound'))

export const router = createBrowserRouter([
  {
    path: '/login',
    // Login is outside <Layout>, so it has no access to Layout's Outlet Suspense boundary
    element: <Suspense fallback={loginFallback}><Login /></Suspense>,
  },
  {
    element: <AuthGuard />, // redirects to /login when unauthenticated
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
                <PageLoader />
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
                <PageLoader />
              </RoleGuard>
            ),
          },
          { path: 'bots', element: <Bots /> },
          { path: 'bots/:botId', element: <Chat /> },
          { path: 'modules/:moduleId', element: <FederatedPage /> },
          { path: '*', element: <NotFound /> },
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
          {
            path: 'admin/layouts',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Layouts />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/docs/ui',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <UIComponentsProvider> {/* docs page needs the component catalogue context */}
                  <DocsUI />
                </UIComponentsProvider>
              </RoleGuard>
            ),
          },
          {
            path: 'admin/docs/api',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <DocsApi />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/docs/deployment',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <DocsDeployment />
              </RoleGuard>
            ),
          },
        ],
      },
    ],
  },
])
