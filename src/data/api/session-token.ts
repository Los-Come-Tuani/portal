const STORAGE_KEY = 'kplan.portal.token'

type Listener = () => void
const expiredListeners = new Set<Listener>()

/** El token Bearer de la sesión, guardado entre recargas. */
export const sessionToken = {
  get(): string | null {
    return localStorage.getItem(STORAGE_KEY)
  },
  set(token: string): void {
    localStorage.setItem(STORAGE_KEY, token)
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  },
  /** La API rechazó el token: se borra y se avisa a quien escuche (AuthProvider). */
  expire(): void {
    localStorage.removeItem(STORAGE_KEY)
    expiredListeners.forEach((listener) => listener())
  },
  onExpired(listener: Listener): () => void {
    expiredListeners.add(listener)
    return () => expiredListeners.delete(listener)
  },
}
