const STORAGE_KEY = 'kplan.portal.session'

type Listener = () => void
const expiredListeners = new Set<Listener>()

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // El navegador bloqueó el almacenamiento: el portal sigue, sin recordar la sesión.
    return null
  }
}

/**
 * Una bandera, no un token. Con la API real la sesión vive en cookies `HttpOnly` que el
 * JavaScript no puede leer (ni robar con un XSS); el portal solo recuerda que hubo un inicio
 * de sesión para decidir si vale la pena preguntarle a la API quién es la persona al abrir.
 * Sin esto, cada primera visita haría una petición que termina en 401.
 */
export const sessionMarker = {
  isSet(): boolean {
    return storage()?.getItem(STORAGE_KEY) === '1'
  },
  set(): void {
    try {
      storage()?.setItem(STORAGE_KEY, '1')
    } catch {
      // Sin espacio o en modo privado: no pasa nada, se vuelve a preguntar a la API.
    }
  },
  clear(): void {
    try {
      storage()?.removeItem(STORAGE_KEY)
    } catch {
      // Igual que arriba.
    }
  },
  /** La API rechazó la sesión y no se pudo renovar: se borra la bandera y se avisa (AuthProvider). */
  expire(): void {
    sessionMarker.clear()
    expiredListeners.forEach((listener) => listener())
  },
  onExpired(listener: Listener): () => void {
    expiredListeners.add(listener)
    return () => expiredListeners.delete(listener)
  },
}
