import { request } from './request'
import type { RequestOptions } from './request'

/** Typed HTTP client for the spin-core API, attaching auth tokens and enforcing a 15-second timeout. */
export const apiService = {
  get<T>(url: string, options?: RequestOptions) {
    return request<T>('GET', url, undefined, options)
  },
  post<T>(url: string, data?: unknown, options?: RequestOptions) {
    return request<T>('POST', url, data, options)
  },
  put<T>(url: string, data?: unknown, options?: RequestOptions) {
    return request<T>('PUT', url, data, options)
  },
  patch<T>(url: string, data?: unknown, options?: RequestOptions) {
    return request<T>('PATCH', url, data, options)
  },
  delete<T>(url: string, options?: RequestOptions) {
    return request<T>('DELETE', url, undefined, options)
  },
}
