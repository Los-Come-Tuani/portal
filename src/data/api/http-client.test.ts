import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from './endpoints'
import { ApiError, ERROR_MESSAGES } from './errors'
import { createFetchTransport, createHttpClient, REQUEST_TIMEOUT_MS, toApiError } from './http-client'
import { sessionMarker } from './session-marker'

const BASE = 'http://api.test'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

function empty(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers })
}

type Call = { path: string; method: string; headers: Record<string, string>; credentials: RequestCredentials | undefined }

/** Un `fetch` falso: anota cada llamada y responde con lo que decida `answer`. */
function fakeFetch(answer: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      path: new URL(String(input)).pathname,
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      credentials: init?.credentials,
    }
    calls.push(call)
    return answer(call)
  })
  return { calls, fetchFn: fetchFn as unknown as typeof fetch }
}

function clientWith(fetchFn: typeof fetch) {
  return createHttpClient(createFetchTransport({ baseUrl: BASE, fetch: fetchFn }))
}

const CSRF = endpoints.auth.csrf
const REFRESH = endpoints.auth.refresh

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cookies y CSRF', () => {
  it('manda las cookies en cada petición y nunca una cabecera Authorization', async () => {
    const { calls, fetchFn } = fakeFetch((call) => (call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : json(200, { ok: true })))
    const { request } = clientWith(fetchFn)

    await request('GET', '/auth/profile/')
    await request('POST', '/auth/two-factor-setup/')

    expect(calls.every((call) => call.credentials === 'include')).toBe(true)
    expect(calls.some((call) => 'Authorization' in call.headers)).toBe(false)
  })

  it('pide el token CSRF una sola vez y lo manda solo en lo que cambia datos', async () => {
    const { calls, fetchFn } = fakeFetch((call) => (call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : json(200, {})))
    const { request } = clientWith(fetchFn)

    await request('GET', '/auth/profile/')
    await request('POST', '/auth/password-change/', { body: { current_password: 'a', password: 'b' } })
    await request('POST', '/auth/session-revoke/')

    expect(calls.filter((call) => call.path === CSRF)).toHaveLength(1)
    const get = calls.find((call) => call.path === '/auth/profile/')
    const posts = calls.filter((call) => call.method === 'POST')
    expect(get?.headers['X-CSRFToken']).toBeUndefined()
    expect(posts.map((call) => call.headers['X-CSRFToken'])).toEqual(['t1', 't1'])
  })

  it('pide el token una sola vez aunque varias peticiones lo necesiten a la vez', async () => {
    const { calls, fetchFn } = fakeFetch((call) => (call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : json(200, {})))
    const { request } = clientWith(fetchFn)

    await Promise.all([request('POST', '/a/'), request('POST', '/b/'), request('PATCH', '/c/')])

    expect(calls.filter((call) => call.path === CSRF)).toHaveLength(1)
  })

  it('se queda con el token fresco que la API manda al abrir la sesión', async () => {
    const { calls, fetchFn } = fakeFetch((call) => {
      if (call.path === CSRF) return empty(204, { 'x-csrftoken': 'viejo' })
      if (call.path === endpoints.auth.login) return json(200, { user: {} }, { 'x-csrftoken': 'nuevo' })
      return json(200, {})
    })
    const { request } = clientWith(fetchFn)

    await request('POST', endpoints.auth.login, { body: { email: 'a@b.co', password: 'x' } })
    await request('POST', '/auth/session-revoke/')

    const posts = calls.filter((call) => call.method === 'POST')
    expect(posts.map((call) => call.headers['X-CSRFToken'])).toEqual(['viejo', 'nuevo'])
  })

  it('si el token CSRF falló, pide uno nuevo y reintenta una sola vez', async () => {
    let tokens = 0
    const { calls, fetchFn } = fakeFetch((call) => {
      if (call.path === CSRF) return empty(204, { 'x-csrftoken': `t${++tokens}` })
      if (call.headers['X-CSRFToken'] === 't1') {
        return json(403, { detail: 'La autenticación CSRF falló.', field_errors: { 'cookies.csrftoken': 'CSRF token missing' } })
      }
      return json(200, { ok: true })
    })
    const { request } = clientWith(fetchFn)

    await expect(request('POST', '/auth/session-revoke/')).resolves.toEqual({ ok: true })
    const posts = calls.filter((call) => call.method === 'POST')
    expect(posts.map((call) => call.headers['X-CSRFToken'])).toEqual(['t1', 't2'])
  })

  it('un 403 que no es de CSRF no se reintenta', async () => {
    const { calls, fetchFn } = fakeFetch((call) =>
      call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : json(403, { detail: 'No tienes permiso.' }),
    )
    const { request } = clientWith(fetchFn)

    await expect(request('POST', '/auth/session-revoke/')).rejects.toMatchObject({ status: 403, message: 'No tienes permiso.' })
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  })
})

describe('sesión vencida', () => {
  /** Responde 401 hasta que alguien renueve la sesión. */
  function expiringSession(options: { refresh?: () => Response | Promise<Response> } = {}) {
    let renewed = false
    return fakeFetch((call) => {
      if (call.path === CSRF) return empty(204, { 'x-csrftoken': 't1' })
      if (call.path === REFRESH) {
        const answer = options.refresh?.() ?? empty(204)
        return Promise.resolve(answer).then((response) => {
          if (response.status < 400) renewed = true
          return response
        })
      }
      return renewed ? json(200, { path: call.path }) : json(401, { detail: 'No autenticado.' })
    })
  }

  it('renueva la sesión una sola vez cuando varias peticiones fallan a la vez y las reintenta', async () => {
    sessionMarker.set()
    const { calls, fetchFn } = expiringSession()
    const { request } = clientWith(fetchFn)

    const results = await Promise.all([request('GET', '/api/a'), request('GET', '/api/b'), request('GET', '/api/c')])

    expect(results).toEqual([{ path: '/api/a' }, { path: '/api/b' }, { path: '/api/c' }])
    expect(calls.filter((call) => call.path === REFRESH)).toHaveLength(1)
    expect(sessionMarker.isSet()).toBe(true)
  })

  it('reintenta cada petición una sola vez', async () => {
    sessionMarker.set()
    const { calls, fetchFn } = fakeFetch((call) => {
      if (call.path === CSRF) return empty(204, { 'x-csrftoken': 't1' })
      if (call.path === REFRESH) return empty(204)
      return json(401, { detail: 'Revocada.' })
    })
    const { request } = clientWith(fetchFn)
    const expired = vi.fn()
    const off = sessionMarker.onExpired(expired)

    await expect(request('GET', '/api/a')).rejects.toMatchObject({ status: 401 })

    expect(calls.filter((call) => call.path === '/api/a')).toHaveLength(2)
    expect(calls.filter((call) => call.path === REFRESH)).toHaveLength(1)
    expect(expired).toHaveBeenCalledTimes(1)
    off()
  })

  it('da la sesión por terminada si la API rechaza la renovación', async () => {
    sessionMarker.set()
    const { fetchFn } = expiringSession({ refresh: () => json(401, { detail: 'Sesión inválida.' }) })
    const { request } = clientWith(fetchFn)
    const expired = vi.fn()
    const off = sessionMarker.onExpired(expired)

    await expect(request('GET', '/auth/profile/')).rejects.toMatchObject({ status: 401 })

    expect(expired).toHaveBeenCalledTimes(1)
    expect(sessionMarker.isSet()).toBe(false)
    off()
  })

  it('no cierra la sesión si la renovación no llega a la API', async () => {
    sessionMarker.set()
    const { fetchFn } = expiringSession({
      refresh: () => {
        throw new TypeError('Failed to fetch')
      },
    })
    const { request } = clientWith(fetchFn)
    const expired = vi.fn()
    const off = sessionMarker.onExpired(expired)

    await expect(request('GET', '/auth/profile/')).rejects.toMatchObject({ status: 0 })

    expect(expired).not.toHaveBeenCalled()
    expect(sessionMarker.isSet()).toBe(true)
    off()
  })

  it('no cierra la sesión si la renovación da un error del servidor', async () => {
    sessionMarker.set()
    const { fetchFn } = expiringSession({ refresh: () => json(503, { detail: 'En mantenimiento.' }) })
    const { request } = clientWith(fetchFn)

    await expect(request('GET', '/auth/profile/')).rejects.toMatchObject({ status: 503 })

    expect(sessionMarker.isSet()).toBe(true)
  })

  it('un 401 del inicio de sesión es la respuesta de la acción: no renueva nada', async () => {
    sessionMarker.set()
    const { calls, fetchFn } = fakeFetch((call) =>
      call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : json(401, { detail: 'Las credenciales proporcionadas no son válidas.' }),
    )
    const { request } = clientWith(fetchFn)

    const failure = request('POST', endpoints.auth.login, { body: { email: 'a@b.co', password: 'mala' } })

    await expect(failure).rejects.toMatchObject({ status: 401, message: 'Las credenciales proporcionadas no son válidas.' })
    expect(calls.some((call) => call.path === REFRESH)).toBe(false)
    expect(sessionMarker.isSet()).toBe(true)
  })

  it('un rechazo de Google tampoco intenta renovar una sesión anterior', async () => {
    sessionMarker.set()
    const { calls, fetchFn } = fakeFetch((call) =>
      call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : json(401, { detail: 'El token de Google no es válido.' }),
    )
    const { request } = clientWith(fetchFn)

    await expect(request('POST', endpoints.auth.google, { body: { id_token: 'token' } })).rejects.toMatchObject({
      status: 401,
      message: 'El token de Google no es válido.',
    })
    expect(calls.some((call) => call.path === REFRESH)).toBe(false)
    expect(sessionMarker.isSet()).toBe(true)
  })

  it('sin una sesión recordada, un 401 no intenta renovar', async () => {
    const { calls, fetchFn } = fakeFetch(() => json(401, { detail: 'No autenticado.' }))
    const { request } = clientWith(fetchFn)

    await expect(request('GET', '/auth/profile/')).rejects.toMatchObject({ status: 401 })

    expect(calls).toHaveLength(1)
  })
})

describe('errores', () => {
  it('lee detail y field_errors de la API en los nombres de los formularios', async () => {
    const { fetchFn } = fakeFetch((call) =>
      call.path === CSRF
        ? empty(204, { 'x-csrftoken': 't1' })
        : json(400, {
            detail: 'Uno o más campos no se pudieron validar.',
            field_errors: { 'body.current_password': 'La contraseña no es válida.' },
          }),
    )
    const { request } = clientWith(fetchFn)

    const error = await request('POST', endpoints.auth.passwordChange, { body: {} }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      message: 'Uno o más campos no se pudieron validar.',
      fieldErrors: { currentPassword: 'La contraseña no es válida.' },
    })
  })

  it('un corte de red es un error sin estado, no una excepción cruda', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch
    const { request } = clientWith(fetchFn)

    await expect(request('GET', '/auth/profile/')).rejects.toMatchObject({ status: 0, message: 'No hay conexión a internet' })
  })

  it('no muestra la página HTML de un 404 ni de un 502: el mensaje sale del estado', async () => {
    const page = '<!DOCTYPE html><html><head><title>Page not found at /api/guide-applications</title></head></html>'
    const fetchFn = vi.fn(async () => new Response(page, { status: 404, headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch
    const { request } = clientWith(fetchFn)

    const error = await request('GET', '/api/guide-applications').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).message).not.toContain('<')
    expect((error as ApiError).message.length).toBeGreaterThan(0)
  })

  it('devuelve el cuerpo de una respuesta sin contenido como nulo', async () => {
    const { fetchFn } = fakeFetch((call) => (call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : empty(204)))
    const { request } = clientWith(fetchFn)

    await expect(request('POST', endpoints.auth.logout)).resolves.toBeNull()
  })
})

describe('toApiError', () => {
  it('lee Retry-After del bloqueo por intentos', () => {
    const error = toApiError({
      status: 429,
      data: { detail: 'Se bloqueó el acceso por demasiados intentos fallidos.' },
      headers: new Headers({ 'retry-after': '900' }),
    })
    expect(error).toMatchObject({ status: 429, retryAfter: 900, message: 'Se bloqueó el acceso por demasiados intentos fallidos.' })
  })

  it('sigue leyendo el formato del backend de demo', () => {
    const error = toApiError({ status: 422, data: { message: 'Revisa los campos marcados', errors: { email: 'Inválido' } } })
    expect(error).toMatchObject({ status: 422, message: 'Revisa los campos marcados', fieldErrors: { email: 'Inválido' }, retryAfter: null })
  })

  it('usa un mensaje por defecto cuando la respuesta no trae texto', () => {
    expect(toApiError({ status: 404, data: null }).message).toBe(ERROR_MESSAGES.notFound)
    expect(toApiError({ status: 429, data: {} }).message).toBe(ERROR_MESSAGES.tooManyRequests)
    expect(toApiError({ status: 409, data: {} }).message).toBe(ERROR_MESSAGES.conflict)
    expect(toApiError({ status: 418, data: { detail: '   ' } }).message).toBe(ERROR_MESSAGES.generic)
  })

  it('nunca muestra el texto de un error del servidor', () => {
    expect(toApiError({ status: 500, data: {} }).message).toBe(ERROR_MESSAGES.server)
    expect(toApiError({ status: 500, data: { detail: "KeyError: 'city'" } }).message).toBe(ERROR_MESSAGES.server)
    expect(toApiError({ status: 503, data: { detail: 'El servicio no está disponible por ahora.' } }).message).toBe(ERROR_MESSAGES.server)
    expect(toApiError({ status: 502, data: null }).message).toBe(ERROR_MESSAGES.server)
  })

  it('cambia los textos por defecto del API por el del estado y conserva los errores por campo', () => {
    const invalid = toApiError({
      status: 400,
      data: { detail: 'La solicitud contiene datos inválidos.', field_errors: { 'body.email': 'Ingrese un correo válido.' } },
    })
    expect(invalid).toMatchObject({ status: 400, message: ERROR_MESSAGES.invalid, fieldErrors: { email: 'Ingrese un correo válido.' } })
    expect(toApiError({ status: 404, data: { detail: 'El recurso solicitado no se encontró.' } }).message).toBe(ERROR_MESSAGES.notFound)
    expect(toApiError({ status: 403, data: { detail: ' No tiene permiso para realizar esta acción. ' } }).message).toBe(ERROR_MESSAGES.forbidden)
    expect(toApiError({ status: 409, data: { detail: 'Hay un conflicto con el estado actual del recurso.' } }).message).toBe(ERROR_MESSAGES.conflict)
    expect(toApiError({ status: 413, data: { detail: 'La solicitud excede los límites permitidos.' } }).message).toBe(ERROR_MESSAGES.tooLarge)
    expect(toApiError({ status: 415, data: { detail: 'No se pudo interpretar la solicitud.' } }).message).toBe(ERROR_MESSAGES.generic)
    expect(toApiError({ status: 406, data: { detail: 'Ha enviado un `Accept` header inválido.' } }).message).toBe(ERROR_MESSAGES.generic)
    expect(toApiError({ status: 401, data: { detail: 'No se proporcionaron credenciales de autenticación válidas.' } }).message).toBe(
      ERROR_MESSAGES.sessionExpired,
    )
  })

  it('deja pasar un texto específico del API en un 4xx', () => {
    expect(toApiError({ status: 409, data: { detail: 'La campaña ya está agotada.' } }).message).toBe('La campaña ya está agotada.')
    expect(toApiError({ status: 404, data: { detail: 'Ese código no es de tu comercio.' } }).message).toBe('Ese código no es de tu comercio.')
  })

  it('en el inicio de sesión el 401 conserva el texto del API aunque sea el de por defecto', async () => {
    const detail = 'No se proporcionaron credenciales de autenticación válidas.'
    const { fetchFn } = fakeFetch((call) => (call.path === CSRF ? empty(204, { 'x-csrftoken': 't1' }) : json(401, { detail })))
    const { request } = clientWith(fetchFn)

    await expect(request('POST', endpoints.auth.login, { body: {} })).rejects.toMatchObject({ status: 401, message: detail })
    await expect(request('GET', '/api/a')).rejects.toMatchObject({ status: 401, message: ERROR_MESSAGES.sessionExpired })
  })
})

describe('tiempo de espera', () => {
  /** Un `fetch` que no responde nunca: sólo termina si lo cancelan. */
  function hangingFetch() {
    return vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) reject(init.signal.reason)
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        }),
    ) as unknown as typeof fetch
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('si el API no responde a tiempo, es un error sin estado que se puede mostrar', async () => {
    const { request } = clientWith(hangingFetch())

    const failure = request('GET', '/api/a').catch((caught: unknown) => caught)
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)

    const error = await failure
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, message: ERROR_MESSAGES.timeout })
  })

  it('no corta antes de tiempo', async () => {
    const { request } = clientWith(hangingFetch())
    const settled = vi.fn()

    void request('GET', '/api/a').then(settled, settled)
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1)

    expect(settled).not.toHaveBeenCalled()
  })

  it('si quien llama cancela, sigue saliendo su AbortError', async () => {
    const { request } = clientWith(hangingFetch())
    const controller = new AbortController()

    const failure = request('GET', '/api/a', { signal: controller.signal }).catch((caught: unknown) => caught)
    controller.abort()

    const error = await failure
    expect(error).not.toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ name: 'AbortError' })
  })

  it('una señal ya cancelada no llega a esperar', async () => {
    const { request } = clientWith(hangingFetch())
    const controller = new AbortController()
    controller.abort()

    await expect(request('GET', '/api/a', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('al responder, no deja el reloj corriendo', async () => {
    const { fetchFn } = fakeFetch(() => json(200, { ok: true }))
    const { request } = clientWith(fetchFn)

    await request('GET', '/api/a')

    expect(vi.getTimerCount()).toBe(0)
  })
})
