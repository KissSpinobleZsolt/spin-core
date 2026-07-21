import { Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Layout from '@components/layout/Layout' // root layout with sidebar + header
import { AuthGuard } from '../../components/guards/AuthGuard' // redirects unauthenticated users to /login
import { RoleGuard } from '../../components/guards/roleGuard' // restricts child routes to admin role
import { FederatedPage } from '../../components/modules/federatedPage' // Webpack module federation loader
import { PageLoader } from '@components/layout/PageLoader' // suspense wrapper for lazy-loaded pages
import { loginFallback } from '../loginFallback.constant' // stable spinner shown during route lazy-load
import {
  Dashboard, Login, Translations, Bots, Chat,
  LLMs, Users, Modules, ModuleDetail, BotDetail, Status, NotFound,
} from './lazyPages.constant' // all code-split page components

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
        element: <Layout />, // shared shell: sidebar, header, main, footer
        children: [
          { index: true, element: <Dashboard /> }, // default child route
          {
            path: 'admin/logs',
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
            path: 'admin/bots',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <PageLoader />
              </RoleGuard>
            ),
          },
          {
            path: 'admin/bots/:id',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <BotDetail />
              </RoleGuard>
            ),
          },
          { path: 'bots', element: <Bots /> }, // bot selection grid
          { path: 'bots/:botId', element: <Chat /> }, // bot chat with per-bot config
          { path: 'modules/:moduleId', element: <FederatedPage /> }, // dynamically federated module
          { path: '*', element: <NotFound /> }, // 404 catch-all
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
            path: 'admin/modules/:scope',
            element: (
              <RoleGuard requiredRoles={['admin']}>
                <ModuleDetail />
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
