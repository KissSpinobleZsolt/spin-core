import { Suspense } from 'react'
import { ErrorBanner } from '../ui/ErrorBanner'
import { FederatedPage } from '../modules/FederatedPage'
import { PageSkeletonLoader } from './PageSkeletonLoader'
import { PAGE_REGISTRY } from '../../pages/registry'
import { usePageConfig } from '@context'

/** Pure renderer — reads current-route page config from PageLoaderProvider and mounts the right component. */
export function PageLoader() {
  const { config, isLoading, isError } = usePageConfig()

  if (isLoading) return <PageSkeletonLoader />
  if (isError || !config) return <ErrorBanner message="Page not found or unavailable." />

  if (config.type === 'native') {
    const Page = config.component_key ? PAGE_REGISTRY[config.component_key] : null
    if (!Page) return <ErrorBanner message={`Unknown page component: ${config.component_key}`} />
    return (
      <Suspense fallback={<PageSkeletonLoader config={config.skeleton} />}>
        <Page />
      </Suspense>
    )
  }

  if (config.type === 'federated') {
    return <FederatedPage />
  }

  return <ErrorBanner message="Unknown page type in registry." />
}
