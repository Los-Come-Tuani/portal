export interface GoogleCredentialResponse {
  credential?: string
}

export interface GoogleIdentity {
  initialize(options: {
    auto_select: boolean
    button_auto_select: boolean
    callback: (response: GoogleCredentialResponse) => void
    client_id: string
  }): void
  renderButton(
    parent: HTMLElement,
    options: {
      locale: string
      logo_alignment: 'left'
      shape: 'rectangular'
      size: 'large'
      text: 'continue_with'
      theme: 'outline'
      type: 'standard'
      width: number
    },
  ): void
  disableAutoSelect(): void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } }
  }
}

const SCRIPT_ID = 'google-identity-services'
const SCRIPT_SOURCE = 'https://accounts.google.com/gsi/client'

function loadedIdentity(): GoogleIdentity | undefined {
  return window.google?.accounts?.id
}

/**
 * Google deja de recordar la cuenta con la que se entró: tras un intento rechazado o al
 * salir, el siguiente clic vuelve a ofrecer las cuentas en vez de usar la misma.
 */
export function forgetGoogleAccount(): void {
  loadedIdentity()?.disableAutoSelect()
}

/** Carga Google Identity Services una sola vez y devuelve su API de tokens de identidad. */
export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const loaded = loadedIdentity()
  if (loaded) return Promise.resolve(loaded)

  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const created = script === null
    script ??= document.createElement('script')

    const onLoad = () => {
      const identity = loadedIdentity()
      if (identity) resolve(identity)
      else reject(new Error('Google Identity Services no quedó disponible.'))
    }
    const onError = () => {
      script.remove()
      reject(new Error('No se pudo cargar Google Identity Services.'))
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (created) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_SOURCE
      script.async = true
      script.defer = true
      document.head.append(script)
    }
  })
}
