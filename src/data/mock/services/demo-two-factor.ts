const STORAGE_KEY = 'kplan.portal.demo.two-factor'

/** En la demo cualquier app de autenticación sirve para escanear: el código que vale es este. */
export const DEMO_CODE = '123456'

const DEMO_SECRET = 'JBSWY3DPEHPK3PXP'
const RECOVERY_CODES = 10
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

interface TwoFactorState {
  enabled: boolean
  pending: boolean
  confirmedAt: string | null
  recoveryCodes: string[]
}

type Store = Record<string, TwoFactorState>

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Store
  } catch {
    return {}
  }
}

function save(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Sin espacio o en modo privado: la demo sigue en memoria del navegador.
  }
}

function newRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length])
  return [0, 4, 8, 12].map((start) => chars.slice(start, start + 4).join('')).join('-')
}

function newRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODES }, newRecoveryCode)
}

function normalize(code: string): string {
  return code.replaceAll('-', '').replaceAll(' ', '').toUpperCase()
}

/** El 2FA del backend de demo: estado por usuario, sin secretos reales. */
export const demoTwoFactor = {
  get(userId: string): TwoFactorState {
    return load()[userId] ?? { enabled: false, pending: false, confirmedAt: null, recoveryCodes: [] }
  },

  start(userId: string, email: string): { secret: string; uri: string } {
    const store = load()
    store[userId] = { enabled: false, pending: true, confirmedAt: null, recoveryCodes: [] }
    save(store)
    const label = encodeURIComponent(`K'Plan:${email}`)
    const issuer = encodeURIComponent("K'Plan")
    return {
      secret: DEMO_SECRET,
      uri: `otpauth://totp/${label}?algorithm=SHA1&digits=6&issuer=${issuer}&period=30&secret=${DEMO_SECRET}`,
    }
  },

  confirm(userId: string, confirmedAt: string): string[] {
    const store = load()
    const codes = newRecoveryCodes()
    store[userId] = { enabled: true, pending: false, confirmedAt, recoveryCodes: codes }
    save(store)
    return codes
  },

  regenerate(userId: string): string[] {
    const store = load()
    const state = store[userId]
    if (!state?.enabled) return []
    state.recoveryCodes = newRecoveryCodes()
    save(store)
    return state.recoveryCodes
  },

  disable(userId: string): void {
    const store = load()
    delete store[userId]
    save(store)
  },

  /** El código de la demo o un código de recuperación (que se gasta al usarlo). */
  accepts(userId: string, code: string): boolean {
    if (code.trim() === DEMO_CODE) return true
    const store = load()
    const state = store[userId]
    const wanted = normalize(code)
    const index = state?.recoveryCodes.findIndex((item) => normalize(item) === wanted) ?? -1
    if (!state || index < 0) return false
    state.recoveryCodes.splice(index, 1)
    save(store)
    return true
  },
}
