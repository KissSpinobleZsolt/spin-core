const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

type RequestOptions = {
  signal?: AbortSignal
  headers?: Record<string, string>
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  const externalSignal = options?.signal
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort())
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('auth_user')
    window.location.href = '/login'
  }

  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status} ${res.statusText}`)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  return res.json() as Promise<T>
}

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
