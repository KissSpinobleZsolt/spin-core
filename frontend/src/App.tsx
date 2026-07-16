import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { AuthGuard } from './components/guards/AuthGuard'
import { RoleGuard } from './components/guards/RoleGuard'
import { FederatedPage } from './components/modules/FederatedPage'
import { PageLoader } from './components/layout/PageLoader'
import { useI18nSync } from './i18n/useI18nSync'
import { CookieConsentModal } from './components/CookieConsentModal'
import { Spinner } from './components/ui/Spinner'

const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Login          = lazy(() => import('./pages/Login'))
const Translations   = lazy(() => import('./pages/Translations'))
const Bots           = lazy(() => import('./pages/Bots'))
const Chat           = lazy(() => import('./pages/Chat'))
const LLMs           = lazy(() => import('./pages/admin/LLMs'))
const Users          = lazy(() => import('./pages/admin/Users'))
const Modules        = lazy(() => import('./pages/admin/Modules'))
const Status         = lazy(() => import('./pages/admin/Status'))
const Components     = lazy(() => import('./pages/admin/Components'))
const Layouts        = lazy(() => import('./pages/admin/Layouts'))
const DocsUI         = lazy(() => import('./pages/admin/docs/UI'))
const DocsApi        = lazy(() => import('./pages/admin/docs/Api'))
const DocsDeployment = lazy(() => import('./pages/admin/docs/Deployment'))
const NotFound       = lazy(() => import('./pages/NotFound'))

// Defined outside the router so the JSX object is stable across re-renders
const loginFallback = (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <Spinner size="lg" />
  </div>
)

const router = createBrowserRouter([
  {
    path: '/login',
    // Login is outside <Layout>, so it has no access to Layout's Outlet Suspense boundary
    element: <Suspense fallback={loginFallback}><Login /></Suspense>,
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
            path: 'admin/components',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <Components />
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
                <DocsUI />
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
