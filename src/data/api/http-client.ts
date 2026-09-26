import { env } from '@/config/env'
import { ApiError, ERROR_MESSAGES } from './errors'
import { sessionToken } from './session-token'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type QueryValue = string | number | boolean | null | undefined | readonly string[]
export type Query = Record<string, QueryValue>

interface RequestOptions {
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

/** Lo que viaja hacia la API, venga de `fetch` o del backend de demo. */
export interface TransportRequest {
  method: HttpMethod
  path: string
  query: URLSearchParams
  body: unknown
  token: string | null
  signal?: AbortSignal
}

export interface TransportResponse {
  status: number
  data: unknown
}

type Transport = (request: TransportRequest) => Promise<TransportResponse>

const fetchTransport: Transport = async ({ method, path, query, body, token, signal }) => {
  const search = query.toString()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${env.apiUrl}${path}${search ? `?${search}` : ''}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, ERROR_MESSAGES.offline)
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }
  return { status: response.status, data }
}

/** El backend de demo se carga aparte: no entra al bundle cuando hay API. */
const mockTransport: Transport = async (request) => {
  const { handleMockRequest } = await import('../mock/server')
  return handleMockRequest(request)
}

const transport: Transport = env.useMocks ? mockTransport : fetchTransport

function toSearchParams(query: Query = {}): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','))
    } else {
      params.set(key, String(value))
    }
  }
  return params
}

/** La API puede responder plano o envuelto en `data` / `Data` (convención .NET). */
function unwrap(data: unknown): unknown {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if ('data' in data) return (data as { data: unknown }).data
    if ('Data' in data) return (data as { Data: unknown }).Data
  }
  return data
}

const DEFAULT_MESSAGES: Record<number, string> = {
  401: ERROR_MESSAGES.sessionExpired,
  403: ERROR_MESSAGES.forbidden,
  404: ERROR_MESSAGES.notFound,
}

function toApiError({ status, data }: TransportResponse): ApiError {
  const payload = (data ?? {}) as { message?: string; Message?: string; errors?: Record<string, string> }
  const message = payload.message ?? payload.Message ?? DEFAULT_MESSAGES[status] ?? ERROR_MESSAGES.generic
  return new ApiError(status, message, payload.errors ?? {})
}

async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const token = sessionToken.get()
  const response = await transport({
    method,
    path,
    query: toSearchParams(options.query),
    body: options.body,
    token,
    signal: options.signal,
  })

  if (response.status === 401 && token) sessionToken.expire()
  if (response.status >= 400) throw toApiError(response)
  return unwrap(response.data) as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T = void>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
