/**
 * Configuración de entorno. Todo `VITE_*` se compila dentro del bundle, así que aquí
 * solo viven valores públicos: nunca claves ni tokens.
 *
 * - `VITE_API_URL`: URL base de la API, sin "/" al final.
 * - `VITE_GOOGLE_CLIENT_ID`: Client ID web público de Google Identity Services.
 * - `VITE_USE_MOCKS=true`: modo demo. El portal usa el backend simulado del navegador
 *   y no necesita API. Es explícito a propósito: antes, dejar `VITE_API_URL` vacía
 *   activaba la demo en silencio, también en un build de producción.
 */
const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'

if (!useMocks && apiUrl === '' && import.meta.env.MODE !== 'test') {
  throw new Error(
    'Falta VITE_API_URL. Defínela en .env.development o .env.development.local, ' +
      'o usa `npm run dev:demo` para el modo demo sin API.',
  )
}

export const env = {
  apiUrl,
  googleClientId,
  useMocks,
  /** Latencia simulada de cada respuesta del modo demo, en ms. */
  mockLatencyMs: 220,
} as const
