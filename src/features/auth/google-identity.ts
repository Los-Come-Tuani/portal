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
  revoke(hint: string, done: (response: { successful: boolean; error?: string }) => void): void
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

/** La cuenta del token de identidad (su `sub` o su correo), sin validarlo: solo para nombrarla ante Google. */
function accountOf(credential: string): string | undefined {
  const payload = credential.split('.')[1]
  if (!payload) return undefined
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const claims = JSON.parse(atob(base64)) as { sub?: unknown; email?: unknown }
    if (typeof claims.sub === 'string') return claims.sub
    return typeof claims.email === 'string' ? claims.email : undefined
  } catch {
    return undefined
  }
}

const REVOKE_TIMEOUT_MS = 3000

/**
 * Tras un intento que el API rechazó, Google retira el permiso que esa cuenta le dio a K'Plan. Si no,
 * el botón queda como "Continuar como …" y el siguiente clic entra con la misma cuenta sin mostrar
 * las demás.
 */
export function forgetRejectedGoogleAccount(credential: string): Promise<void> {
  const identity = loadedIdentity()
  identity?.disableAutoSelect()
  const account = accountOf(credential)
  if (!identity || !account) return Promise.resolve()

  return new Promise((resolve) => {
    const timer = setTimeout(resolve, REVOKE_TIMEOUT_MS)
    identity.revoke(account, () => {
      clearTimeout(timer)
      resolve()
    })
  })
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
