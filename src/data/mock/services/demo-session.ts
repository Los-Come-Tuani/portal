const SESSION_KEY = 'kplan.portal.demo.session'
const CHALLENGE_KEY = 'kplan.portal.demo.challenge'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Sin espacio o en modo privado: la demo sigue, pero no recuerda la sesión.
  }
}

/**
 * Las cookies de la API real, dentro del backend de demo: quién tiene la sesión abierta y
 * quién va a medias del 2FA. Solo el backend de demo las lee; el portal no.
 */
export const demoSession = {
  userId: () => read(SESSION_KEY),
  open(userId: string): void {
    write(SESSION_KEY, userId)
    write(CHALLENGE_KEY, null)
  },
  close(): void {
    write(SESSION_KEY, null)
    write(CHALLENGE_KEY, null)
  },
  challengeUserId: () => read(CHALLENGE_KEY),
  startChallenge: (userId: string) => write(CHALLENGE_KEY, userId),
  clearChallenge: () => write(CHALLENGE_KEY, null),
}
