/**
 * Pruebas contra un API de verdad: comprueban que el cliente y el contrato real coinciden
 * (cookies, CSRF, CORS, 2FA, renovación de sesión). No corren solas; hace falta un API local
 * y una cuenta que pueda entrar al portal:
 *
 *   KPLAN_API_URL=http://localhost:8080 KPLAN_TEST_EMAIL=... KPLAN_TEST_PASSWORD=... npx vitest run src/data/api/api.integration.test.ts
 *
 * Activan y desactivan el 2FA de esa cuenta, así que úsala solo con una cuenta de desarrollo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiLoginResponseSchema, apiSessionUserSchema } from '../schemas/session.schema'
import { endpoints } from './endpoints'
import { createFetchTransport, createHttpClient } from './http-client'
import { sessionMarker } from './session-marker'

const processEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const API_URL = processEnv.KPLAN_API_URL
const EMAIL = processEnv.KPLAN_TEST_EMAIL
const PASSWORD = processEnv.KPLAN_TEST_PASSWORD
const PORTAL_ORIGIN = 'http://localhost:5173'

/** Lo mínimo de un navegador: guarda las cookies que pone la API y las manda de vuelta. */
function createCookieJar() {
  const cookies = new Map<string, string>()
  const jarFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    if (cookies.size > 0) headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '))
    headers.set('origin', PORTAL_ORIGIN)
    const response = await fetch(input, { ...init, headers })
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';')
      const [name, ...rest] = pair.split('=')
      const value = rest.join('=')
      if (value === '' || /max-age=0/i.test(line)) cookies.delete(name.trim())
      else cookies.set(name.trim(), value)
    }
    return response
  }) as typeof fetch
  return { fetch: jarFetch, cookies }
}

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

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  const bits = [...input.replace(/=+$/, '').toUpperCase()].map((char) => BASE32.indexOf(char).toString(2).padStart(5, '0')).join('')
  return Uint8Array.from({ length: Math.floor(bits.length / 8) }, (_, index) => parseInt(bits.slice(index * 8, index * 8 + 8), 2))
}

/** El código de 6 dígitos que mostraría la app de autenticación (RFC 6238, SHA-1, 30 s). */
async function totp(secret: string): Promise<string> {
  const counter = new DataView(new ArrayBuffer(8))
  counter.setBigUint64(0, BigInt(Math.floor(Date.now() / 1000 / 30)))
  const key = await crypto.subtle.importKey('raw', base32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter))
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return String(binary % 1_000_000).padStart(6, '0')
}

describe.skipIf(!API_URL || !EMAIL || !PASSWORD)('contra el API real', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function connect() {
    const jar = createCookieJar()
    const { request } = createHttpClient(createFetchTransport({ baseUrl: API_URL as string, fetch: jar.fetch }))
    return { request, jar }
  }

  const credentials = () => ({ email: EMAIL, password: PASSWORD })

  it('permite al portal el origen con credenciales y expone la cabecera CSRF', async () => {
    const preflight = await fetch(`${API_URL}${endpoints.auth.login}`, {
      method: 'OPTIONS',
      headers: {
        origin: PORTAL_ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-csrftoken',
      },
    })
    expect(preflight.headers.get('access-control-allow-origin')).toBe(PORTAL_ORIGIN)
    expect(preflight.headers.get('access-control-allow-credentials')).toBe('true')
    expect(preflight.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('x-csrftoken')

    const csrf = await fetch(`${API_URL}${endpoints.auth.csrf}`, { headers: { origin: PORTAL_ORIGIN } })
    expect(csrf.status).toBe(204)
    expect(csrf.headers.get('x-csrftoken')).toBeTruthy()
    expect(csrf.headers.get('access-control-expose-headers')?.toLowerCase()).toContain('x-csrftoken')
  })

  it('una contraseña mala da 401 con el mensaje de la API y no renueva nada', async () => {
    const { request } = connect()
    sessionMarker.set()

    const failure = request('POST', endpoints.auth.login, { body: { ...credentials(), password: `${PASSWORD}-mala` } })

    await expect(failure).rejects.toMatchObject({ status: 401 })
    expect(sessionMarker.isSet()).toBe(true)
  })

  it('abre la sesión, lee el perfil, renueva un acceso vencido y cierra', async () => {
    const { request, jar } = connect()

    const login = apiLoginResponseSchema.parse(await request('POST', endpoints.auth.login, { body: credentials() }))
    expect(login.user.email).toBe(EMAIL?.toLowerCase())
    expect(jar.cookies.has('access')).toBe(true)
    expect(jar.cookies.has('refresh')).toBe(true)
    sessionMarker.set()

    const profile = apiSessionUserSchema.parse(await request('GET', endpoints.auth.profile))
    expect(profile.id).toBe(login.user.id)

    // Se pierde el acceso (venció): la API da 401, el cliente renueva con el refresh y reintenta.
    jar.cookies.delete('access')
    const renewed = apiSessionUserSchema.parse(await request('GET', endpoints.auth.profile))
    expect(renewed.id).toBe(login.user.id)
    expect(jar.cookies.has('access')).toBe(true)

    await request('POST', endpoints.auth.logout)
    sessionMarker.clear()
    expect(jar.cookies.has('access')).toBe(false)
    await expect(request('GET', endpoints.auth.profile)).rejects.toMatchObject({ status: 401 })
  })

  it('activa el 2FA con un código real, entra con el reto y lo desactiva', async () => {
    // Los códigos de recuperación que siguen sirviendo mientras el 2FA esté activo.
    let alive: string[] | null = null

    try {
      const first = connect()
      await first.request('POST', endpoints.auth.login, { body: credentials() })
      sessionMarker.set()

      const setup = await first.request<{ secret: string; uri: string }>('POST', endpoints.auth.twoFactorSetup)
      expect(setup.uri).toMatch(/^otpauth:\/\/totp\//)
      expect(setup.secret).toMatch(/^[A-Z2-7]+$/)

      const confirmed = await first.request<{ codes: string[] }>('POST', endpoints.auth.twoFactorConfirm, {
        body: { code: await totp(setup.secret) },
      })
      expect(confirmed.codes).toHaveLength(10)
      alive = confirmed.codes

      const status = await first.request<{ enabled: boolean; pending: boolean; recovery_codes: number; confirmed_at: string | null }>(
        'GET',
        endpoints.auth.twoFactorStatus,
      )
      expect(status).toMatchObject({ enabled: true, pending: false, recovery_codes: 10 })
      expect(status.confirmed_at).toBeTruthy()

      // Una sesión nueva: la contraseña ya no basta, la API pide el segundo paso.
      await first.request('POST', endpoints.auth.logout)
      const second = connect()
      const challenge = await second.request<{ expires_in: number }>('POST', endpoints.auth.login, { body: credentials() })
      expect(challenge.expires_in).toBeGreaterThan(0)
      expect(second.jar.cookies.has('challenge')).toBe(true)
      expect(second.jar.cookies.has('access')).toBe(false)

      // Un código de recuperación sirve en lugar del de la app, y solo una vez.
      const entered = apiLoginResponseSchema.parse(await second.request('POST', endpoints.auth.twoFactor, { body: { code: alive[0] } }))
      alive = alive.slice(1)
      expect(entered.user.two_factor.enabled).toBe(true)
      expect(second.jar.cookies.has('access')).toBe(true)
      sessionMarker.set()

      const fresh = await second.request<{ codes: string[] }>('POST', endpoints.auth.twoFactorRecovery, { body: { code: alive[0] } })
      expect(fresh.codes).toHaveLength(10)
      alive = fresh.codes

      await second.request('POST', endpoints.auth.twoFactorDisable, { body: { code: alive[0], password: PASSWORD } })
      alive = null
      const after = await second.request<{ enabled: boolean }>('GET', endpoints.auth.twoFactorStatus)
      expect(after.enabled).toBe(false)
    } finally {
      // Si algo falló a medias, la cuenta se deja como estaba: sin 2FA.
      if (alive) {
        const cleanup = connect()
        await cleanup.request('POST', endpoints.auth.login, { body: credentials() })
        await cleanup.request('POST', endpoints.auth.twoFactor, { body: { code: alive[0] } })
        sessionMarker.set()
        await cleanup.request('POST', endpoints.auth.twoFactorDisable, { body: { code: alive[1], password: PASSWORD } })
      }
    }
  })
})
