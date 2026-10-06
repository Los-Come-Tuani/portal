import { env } from '@/config/env'
import { endpoints } from './endpoints'
import { ApiError, ERROR_MESSAGES, normalizeFieldErrors, parseRetryAfter } from './errors'
import { sessionMarker } from './session-marker'

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
  signal?: AbortSignal
}

export interface TransportResponse {
  status: number
  data: unknown
  /** Solo las trae el transporte real: el backend de demo no tiene cabeceras. */
  headers?: { get(name: string): string | null }
}

export type Transport = (request: TransportRequest) => Promise<TransportResponse>

const CSRF_HEADER = 'x-csrftoken'

/** El 403 de Django cuando el token CSRF falta o no coincide con la cookie. */
function isCsrfFailure(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const { detail, field_errors: fields } = data as { detail?: unknown; field_errors?: unknown }
  if (typeof detail === 'string' && /csrf/i.test(detail)) return true
  return !!fields && typeof fields === 'object' && Object.keys(fields).some((key) => /csrf/i.test(key))
}

interface FetchTransportOptions {
  baseUrl: string
  /** Para las pruebas; en el navegador es el `fetch` global. */
  fetch?: typeof fetch
}

/**
 * El transporte real. La sesión viaja en cookies `HttpOnly` (`credentials: 'include'`), así
 * que ningún token pasa por JavaScript. Como las cookies se mandan solas, cada petición que
 * cambia datos lleva además el token CSRF en una cabecera que un sitio ajeno no puede poner.
 */
export function createFetchTransport({ baseUrl, fetch: fetchFn = (...args) => fetch(...args) }: FetchTransportOptions): Transport {
  let csrfToken: string | null = null
  let csrfRequest: Promise<string> | null = null

  async function call(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetchFn(url, { ...init, credentials: 'include' })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ApiError(0, ERROR_MESSAGES.offline)
    }
  }

  /** El token se pide una sola vez aunque varias peticiones lo necesiten a la vez. */
  function loadCsrf(): Promise<string> {
    csrfRequest ??= call(`${baseUrl}${endpoints.auth.csrf}`, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        // La respuesta no trae cuerpo; se lee igual para soltar la conexión y que el navegador no la marque como cancelada.
        await response.text().catch(() => '')
        const token = response.headers.get(CSRF_HEADER)
        if (!token) throw new ApiError(response.status, ERROR_MESSAGES.generic)
        csrfToken = token
        return token
      })
      .finally(() => {
        csrfRequest = null
      })
    return csrfRequest
  }

  async function send({ method, path, query, body, signal }: TransportRequest): Promise<TransportResponse> {
    const search = query.toString()
    const multipart = body instanceof FormData
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
    if (method !== 'GET') headers['X-CSRFToken'] = csrfToken ?? (await loadCsrf())

    const response = await call(`${baseUrl}${path}${search ? `?${search}` : ''}`, {
      method,
      headers,
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
      signal,
    })

    // La API manda un token fresco en las respuestas de sesión (login, refresco, cierre).
    const fresh = response.headers.get(CSRF_HEADER)
    if (fresh) csrfToken = fresh

    const text = await response.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = { message: text }
      }
    }
    return { status: response.status, data, headers: response.headers }
  }

  return async (request) => {
    const response = await send(request)
    // Sin la cookie CSRF (borrada, o nunca pedida en este navegador) el token no sirve:
    // se pide uno nuevo y se reintenta una sola vez.
    if (request.method !== 'GET' && response.status === 403 && isCsrfFailure(response.data)) {
      csrfToken = null
      return send(request)
    }
    return response
  }
}

/** El backend de demo se carga aparte: no entra al bundle cuando hay API. */
const mockTransport: Transport = async (request) => {
  const { handleMockRequest } = await import('../mock/server')
  return handleMockRequest(request)
}

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
  429: ERROR_MESSAGES.tooManyRequests,
}

/** La API responde `{ detail, field_errors }`; el backend de demo, `{ message, errors }`. */
export function toApiError({ status, data, headers }: TransportResponse): ApiError {
  const payload = (data ?? {}) as {
    detail?: unknown
    message?: unknown
    Message?: unknown
    field_errors?: unknown
    errors?: unknown
  }
  const text = [payload.detail, payload.message, payload.Message].find((value) => typeof value === 'string' && value !== '')
  const message = (text as string | undefined) ?? DEFAULT_MESSAGES[status] ?? ERROR_MESSAGES.generic
  return new ApiError(
    status,
    message,
    normalizeFieldErrors(payload.field_errors ?? payload.errors),
    parseRetryAfter(headers?.get('retry-after')),
  )
}

/**
 * En estas rutas un 401 es la respuesta de la acción (credenciales o código malos), no una
 * sesión vencida: renovar la sesión y reintentar solo escondería el error.
 */
const OWN_401: ReadonlySet<string> = new Set([
  endpoints.auth.login,
  endpoints.auth.twoFactor,
  endpoints.auth.refresh,
  endpoints.auth.logout,
  endpoints.auth.passwordForgot,
  endpoints.auth.passwordReset,
])

/**
 * El cliente de la API. Si una petición con sesión recibe 401, el `access` venció: se renueva
 * la sesión (una sola vez aunque fallen varias peticiones a la vez, porque el `refresh` es de
 * un solo uso) y se reintenta. Si la renovación falla, la sesión se da por terminada.
 */
export function createHttpClient(transport: Transport) {
  let renewing: Promise<boolean> | null = null

  /** `true`: sesión renovada. `false`: la API la rechazó. Un fallo de red o un 5xx se lanzan. */
  function renewSession(): Promise<boolean> {
    renewing ??= transport({ method: 'POST', path: endpoints.auth.refresh, query: new URLSearchParams(), body: undefined })
      .then((response) => {
        if (response.status < 400) return true
        if (response.status === 401 || response.status === 403) return false
        throw toApiError(response)
      })
      .finally(() => {
        renewing = null
      })
    return renewing
  }

  async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
    const query = toSearchParams(options.query)
    const send = () => transport({ method, path, query, body: options.body, signal: options.signal })

    let response = await send()

    if (response.status === 401 && sessionMarker.isSet() && !OWN_401.has(path)) {
      const renewed = await renewSession()
      if (renewed) response = await send()
      if (!renewed || response.status === 401) sessionMarker.expire()
    }

    if (response.status >= 400) throw toApiError(response)
    return unwrap(response.data) as T
  }

  return { request }
}

const client = createHttpClient(env.useMocks ? mockTransport : createFetchTransport({ baseUrl: env.apiUrl }))
const { request } = client

/** A la API va como `multipart/form-data` (campo `file`); al backend de demo, como `data:`. */
async function upload<T>(path: string, file: File): Promise<T> {
  if (env.useMocks) {
    const { toFilePayload } = await import('./file-payload')
    return request<T>('POST', path, { body: await toFilePayload(file) })
  }
  const form = new FormData()
  form.append('file', file)
  return request<T>('POST', path, { body: form })
}

export const http = {
  upload,
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T = void>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
