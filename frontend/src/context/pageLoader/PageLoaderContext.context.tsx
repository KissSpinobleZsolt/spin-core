/** @module context/pageLoader — Fetches the DB page config for the current route and makes it available to any descendant. */
import { createContext, useContext, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { pagesService } from '@services'
import { useGet } from '@hooks'
import type { PageLoaderContextValue } from './PageLoaderContextValue.type'
import type { PageConfig } from '@services'

const PageLoaderContext = createContext<PageLoaderContextValue>({
  config: null,
  isLoading: false,
  isError: false,
})

export function PageLoaderProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const route = pathname.replace(/^\//, '') // Strip leading slash to match backend route key format

  // Fires for every authenticated route including ones not using PageLoader;
  // 404s from non-registered routes are cached by TQ (retry:false) and silently ignored by those pages.
  const { data: config = null, isLoading, isError } = useGet<PageConfig>(
    ['page-config', route],
    () => pagesService.getPageConfig(route),
    { staleTime: 5 * 60 * 1000, retry: false },
  )

  return (
    <PageLoaderContext.Provider value={{ config, isLoading, isError }}>
      {children}
    </PageLoaderContext.Provider>
  )
}

/** Subscribe to the current route's page config. Available inside <Layout> (wraps <Outlet>). */
export function usePageConfig(): PageLoaderContextValue {
  return useContext(PageLoaderContext)
}
