import type { PageConfig } from '@services'

/** Shape of the value exposed by PageLoaderContext. */
export interface PageLoaderContextValue {
  config: PageConfig | null
  isLoading: boolean
  isError: boolean
}
