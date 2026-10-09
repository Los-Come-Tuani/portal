import { afterEach, describe, expect, it, vi } from 'vitest'
import { chooseGoogleAccount, loadGoogleAccounts, type GoogleOAuth2, type GoogleTokenError, type GoogleTokenResponse } from './google-identity'

type Options = Parameters<GoogleOAuth2['initTokenClient']>[0]

/** Un cliente de tokens que responde lo que se le diga al pedir el token. */
function oauth2(answer: (options: Options) => void = () => undefined) {
  const requestAccessToken = vi.fn()
  const initTokenClient = vi.fn((options: Options) => {
    requestAccessToken.mockImplementation(() => answer(options))
    return { requestAccessToken }
  })
  return { initTokenClient, requestAccessToken }
}

const withGoogle = (client: GoogleOAuth2) => vi.stubGlobal('window', { google: { accounts: { oauth2: client } } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Google Identity Services', () => {
  it('reutiliza el cliente cuando Google ya cargó', async () => {
    const loaded = oauth2()
    withGoogle(loaded)

    await expect(loadGoogleAccounts()).resolves.toBe(loaded)
  })

  it('carga el script oficial una sola vez', async () => {
    const fakeWindow: { google?: { accounts: { oauth2: GoogleOAuth2 } } } = {}
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

    const first = loadGoogleAccounts()
    const second = loadGoogleAccounts()

    expect(append).toHaveBeenCalledTimes(1)
    expect(script.src).toBe('https://accounts.google.com/gsi/client')

    const loaded = oauth2()
    fakeWindow.google = { accounts: { oauth2: loaded } }
    script.dispatchEvent(new Event('load'))

    await expect(first).resolves.toBe(loaded)
    await expect(second).resolves.toBe(loaded)
  })

  it('cada clic abre el selector de cuentas y devuelve el token de la elegida', async () => {
    const client = oauth2((options) => options.callback({ access_token: 'ya29.token' } satisfies GoogleTokenResponse))
    withGoogle(client)

    await expect(chooseGoogleAccount('cliente.apps.googleusercontent.com')).resolves.toBe('ya29.token')
    expect(client.initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'cliente.apps.googleusercontent.com', prompt: 'select_account', scope: 'openid email' }),
    )
    expect(client.requestAccessToken).toHaveBeenCalledTimes(1)
  })

  it('cerrar la ventana no es un error', async () => {
    withGoogle(oauth2((options) => options.error_callback({ type: 'popup_closed' } satisfies GoogleTokenError)))

    await expect(chooseGoogleAccount('cliente')).resolves.toBeNull()
  })

  it('si Google no abre la ventana o no da el token, lo dice', async () => {
    withGoogle(oauth2((options) => options.error_callback({ type: 'popup_failed_to_open' })))
    await expect(chooseGoogleAccount('cliente')).rejects.toThrow(/bloqueando/)

    withGoogle(oauth2((options) => options.callback({ error: 'access_denied' })))
    await expect(chooseGoogleAccount('cliente')).rejects.toThrow('access_denied')
  })

  it('sin el script cargado no intenta abrir nada', async () => {
    vi.stubGlobal('window', {})

    await expect(chooseGoogleAccount('cliente')).rejects.toThrow(/todavía no cargó/)
  })
})
