export interface GoogleCredentialResponse {
  credential?: string
}

export interface GoogleIdentity {
  initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void
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
