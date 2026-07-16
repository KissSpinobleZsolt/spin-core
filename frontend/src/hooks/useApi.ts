import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { apiService } from '@services'

/** Read a resource. Re-fetches when queryKey changes. */
export function useGet<T>(
  queryKey: unknown[],
  urlOrFn: string | (() => Promise<T>),
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T>({
    queryKey,
    queryFn: ({ signal }) =>
      typeof urlOrFn === 'function'
        ? urlOrFn()
        : apiService.get<T>(urlOrFn, { signal }),
    ...options,
  })
}
