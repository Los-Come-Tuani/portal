import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from './endpoints'
import { ApiError } from './errors'
import { createFetchTransport, createHttpClient, toApiError } from './http-client'
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
    expect(toApiError({ status: 404, data: null }).message).toBe('No encontramos lo que buscas')
    expect(toApiError({ status: 429, data: {} }).message).toBe('Demasiados intentos, espera un momento e intenta de nuevo')
    expect(toApiError({ status: 500, data: {} }).message).toBe('Algo salió mal, intenta de nuevo')
  })
})
