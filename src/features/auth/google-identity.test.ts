import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadGoogleIdentity, type GoogleIdentity } from './google-identity'

function identity(): GoogleIdentity {
  return { initialize: vi.fn(), renderButton: vi.fn() }
}

afterEach(() => {
  vi.unstubAllGlobals()
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
})
