const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

/** Options forwarded to the underlying fetch call. */
export type RequestOptions = {
  signal?: AbortSignal
  headers?: Record<string, string>
}

/** Core fetch wrapper: attaches auth token, enforces a 15-second timeout, and handles 401 redirects. */
export async function request<T>(
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

  // Own controller drives the timeout; external signal is bridged in rather than passed directly
  // because AbortSignal.any() lacks broad browser support and fetch only accepts one signal
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
    if (token) {
      // Token was present but rejected — session expired or revoked
      window.location.href = '/login'
    } else {
      throw new Error(`${method} ${url} → 401 Unauthorized`)
    }
  }

  if (!res.ok) {
    throw new Error(`${method} ${url} → ${res.status} ${res.statusText}`)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T
  }

  return res.json() as Promise<T>
}
