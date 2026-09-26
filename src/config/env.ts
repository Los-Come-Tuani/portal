const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export const env = {
  apiUrl,
  /** Sin VITE_API_URL el portal corre en modo demo, contra el backend simulado. */
  useMocks: apiUrl === '',
  /** Latencia simulada de cada respuesta del modo demo, en ms. */
  mockLatencyMs: 220,
} as const
