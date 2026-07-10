import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { apiService } from '../services/apiService'

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

/** POST — creates a resource and optionally invalidates related queries. */
export function useCreate<TData, TBody = unknown>(
  url: string,
  invalidateKeys?: unknown[][],
  options?: UseMutationOptions<TData, Error, TBody>,
) {
  const qc = useQueryClient()
  return useMutation<TData, Error, TBody>({
    mutationFn: (body) => apiService.post<TData>(url, body),
    onSuccess: (...args) => {
      invalidateKeys?.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      options?.onSuccess?.(...args)
    },
    ...options,
  })
}

/** PUT — full update of a resource. */
export function useUpdate<TData, TBody = unknown>(
  url: string,
  invalidateKeys?: unknown[][],
  options?: UseMutationOptions<TData, Error, TBody>,
) {
  const qc = useQueryClient()
  return useMutation<TData, Error, TBody>({
    mutationFn: (body) => apiService.put<TData>(url, body),
    onSuccess: (...args) => {
      invalidateKeys?.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      options?.onSuccess?.(...args)
    },
    ...options,
  })
}

/** PATCH — partial update of a resource. */
export function usePatch<TData, TBody = unknown>(
  url: string,
  invalidateKeys?: unknown[][],
  options?: UseMutationOptions<TData, Error, TBody>,
) {
  const qc = useQueryClient()
  return useMutation<TData, Error, TBody>({
    mutationFn: (body) => apiService.patch<TData>(url, body),
    onSuccess: (...args) => {
      invalidateKeys?.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      options?.onSuccess?.(...args)
    },
    ...options,
  })
}

/** DELETE — removes a resource. */
export function useDelete<TData = void>(
  url: string,
  invalidateKeys?: unknown[][],
  options?: UseMutationOptions<TData, Error, void>,
) {
  const qc = useQueryClient()
  return useMutation<TData, Error, void>({
    mutationFn: () => apiService.delete<TData>(url),
    onSuccess: (...args) => {
      invalidateKeys?.forEach((key) => qc.invalidateQueries({ queryKey: key }))
      options?.onSuccess?.(...args)
    },
    ...options,
  })
}
