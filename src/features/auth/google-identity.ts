export interface GoogleTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

export interface GoogleTokenError {
  type: 'popup_failed_to_open' | 'popup_closed' | 'unknown'
}

export interface GoogleOAuth2 {
  initTokenClient(options: {
    callback: (response: GoogleTokenResponse) => void
    client_id: string
    error_callback: (error: GoogleTokenError) => void
    prompt: 'select_account'
    scope: string
  }): { requestAccessToken(): void }
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } }
  }
}

const SCRIPT_ID = 'google-identity-services'
const SCRIPT_SOURCE = 'https://accounts.google.com/gsi/client'

function loadedOAuth2(): GoogleOAuth2 | undefined {
  return window.google?.accounts?.oauth2
}

/** Carga Google Identity Services una sola vez y devuelve su cliente de tokens. */
export function loadGoogleAccounts(): Promise<GoogleOAuth2> {
  const loaded = loadedOAuth2()
  if (loaded) return Promise.resolve(loaded)

  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const created = script === null
    script ??= document.createElement('script')

    const onLoad = () => {
      const oauth2 = loadedOAuth2()
      if (oauth2) resolve(oauth2)
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

/**
 * Abre el selector de cuentas de Google (`prompt=select_account`) y devuelve el token de acceso
 * de la cuenta elegida, o `null` si la persona cerró la ventana. Siempre muestra todas las cuentas
 * y "Usar otra cuenta": el botón de identidad, en cambio, se queda con la última que se eligió.
 *
 * Hay que llamarla dentro del clic, con el script ya cargado: si no, el navegador bloquea la ventana.
 */
export function chooseGoogleAccount(clientId: string): Promise<string | null> {
  const oauth2 = loadedOAuth2()
  if (!oauth2) return Promise.reject(new Error('Google todavía no cargó.'))

  return new Promise((resolve, reject) => {
    oauth2
      .initTokenClient({
        client_id: clientId,
        scope: 'openid email',
        prompt: 'select_account',
        callback: (response) => {
          if (response.access_token) resolve(response.access_token)
          else reject(new Error(response.error_description || response.error || 'Google no entregó el token.'))
        },
        error_callback: (error) => {
          if (error.type === 'popup_closed') resolve(null)
          else reject(new Error('No se pudo abrir la ventana de Google. Revisa que el navegador no la esté bloqueando.'))
        },
      })
      .requestAccessToken()
  })
}
