import { afterEach, describe, expect, it, vi } from 'vitest'
import { forgetGoogleAccount, forgetRejectedGoogleAccount, loadGoogleIdentity, type GoogleIdentity } from './google-identity'

function identity(): GoogleIdentity {
  return {
    disableAutoSelect: vi.fn(),
    initialize: vi.fn(),
    renderButton: vi.fn(),
    revoke: vi.fn((_hint: string, done: (response: { successful: boolean }) => void) => done({ successful: true })),
  }
}

/** Un token de identidad con esos datos; la firma no importa: el portal no lo valida. */
function credential(claims: Record<string, string>): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'RS256' })}.${encode(claims)}.firma`
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Google Identity Services', () => {
  it('reutiliza la API cuando Google ya la cargó', async () => {
    const loaded = identity()
    vi.stubGlobal('window', { google: { accounts: { id: loaded } } })

    await expect(loadGoogleIdentity()).resolves.toBe(loaded)
  })

  it('carga el script oficial una sola vez', async () => {
    const fakeWindow: { google?: { accounts: { id: GoogleIdentity } } } = {}
    const script = Object.assign(new EventTarget(), {
      async: false,
      defer: false,
      id: '',
      remove: vi.fn(),
      src: '',
    }) as unknown as HTMLScriptElement
    let inserted: HTMLScriptElement | null = null
    const append = vi.fn((next: HTMLScriptElement) => {
      inserted = next
    })
    vi.stubGlobal('window', fakeWindow)
    vi.stubGlobal('document', {
      createElement: vi.fn(() => script),
      getElementById: vi.fn(() => inserted),
      head: { append },
    })

    const first = loadGoogleIdentity()
    const second = loadGoogleIdentity()

    expect(append).toHaveBeenCalledTimes(1)
    expect(script.src).toBe('https://accounts.google.com/gsi/client')

    const loaded = identity()
    fakeWindow.google = { accounts: { id: loaded } }
    script.dispatchEvent(new Event('load'))

    await expect(first).resolves.toBe(loaded)
    await expect(second).resolves.toBe(loaded)
  })

  it('olvida la cuenta elegida para que el siguiente clic ofrezca las cuentas', () => {
    const loaded = identity()
    vi.stubGlobal('window', { google: { accounts: { id: loaded } } })

    forgetGoogleAccount()

    expect(loaded.disableAutoSelect).toHaveBeenCalledTimes(1)
  })

  it('no falla si Google todavía no cargó', async () => {
    vi.stubGlobal('window', {})

    expect(() => forgetGoogleAccount()).not.toThrow()
    await expect(forgetRejectedGoogleAccount(credential({ sub: '123' }))).resolves.toBeUndefined()
  })

  it('tras un rechazo, Google olvida esa cuenta para que el botón vuelva a mostrar las demás', async () => {
    const loaded = identity()
    vi.stubGlobal('window', { google: { accounts: { id: loaded } } })

    await forgetRejectedGoogleAccount(credential({ sub: '1098', email: 'ana@gmail.com', name: 'Ana' }))

    expect(loaded.disableAutoSelect).toHaveBeenCalledTimes(1)
    expect(loaded.revoke).toHaveBeenCalledWith('1098', expect.any(Function))
  })

  it('sin sub usa el correo, y con un token ilegible no revoca nada', async () => {
    const loaded = identity()
    vi.stubGlobal('window', { google: { accounts: { id: loaded } } })

    await forgetRejectedGoogleAccount(credential({ email: 'ana@gmail.com' }))
    await forgetRejectedGoogleAccount('no-es-un-token')

    expect(loaded.revoke).toHaveBeenCalledTimes(1)
    expect(loaded.revoke).toHaveBeenCalledWith('ana@gmail.com', expect.any(Function))
  })

  it('si Google no responde, sigue igual al rato', async () => {
    vi.useFakeTimers()
    const loaded = { ...identity(), revoke: vi.fn() }
    vi.stubGlobal('window', { google: { accounts: { id: loaded } } })

    const forgetting = forgetRejectedGoogleAccount(credential({ sub: '1098' }))
    await vi.advanceTimersByTimeAsync(3000)

    await expect(forgetting).resolves.toBeUndefined()
  })
})
