/**
 * Los textos de la app donde los hay, para que el portal y la app se lean igual. Nunca llevan el
 * código de estado ni el texto técnico del servidor.
 */
export const ERROR_MESSAGES = {
  generic: 'Algo salió mal, intenta de nuevo',
  offline: 'No hay conexión a internet',
  timeout: 'El servidor tardó demasiado en responder, intenta de nuevo',
  server: 'Tuvimos un problema de nuestro lado, intenta de nuevo en unos minutos',
  invalid: 'Revisa los datos e intenta de nuevo',
  sessionExpired: 'Sesión expirada, vuelve a iniciar sesión',
  forbidden: 'No tienes permiso para hacer esto',
  notFound: 'No encontramos lo que buscas',
  conflict: 'Esto cambió hace un momento, recarga la página e intenta de nuevo',
  tooLarge: 'Lo que intentas enviar pesa demasiado, prueba con un archivo más liviano',
  tooManyRequests: 'Demasiados intentos, espera un momento e intenta de nuevo',
} as const

export class ApiError extends Error {
  readonly status: number
  /** Errores por campo que devuelve la API al validar un formulario. */
  readonly fieldErrors: Record<string, string>
  /** Segundos que pide esperar la API (cabecera `Retry-After`), sobre todo en el 429. */
  readonly retryAfter: number | null

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return ERROR_MESSAGES.generic
}

/** De dónde viaja el dato que falló: la API lo antepone al nombre del campo (`body.email`). */
const REQUEST_SCOPES = new Set(['body', 'cookies', 'files', 'headers', 'path', 'query'])

function camelCase(segment: string): string {
  return segment.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase())
}

/**
 * El nombre del campo como lo conoce el formulario: sin el origen y en camelCase.
 * `body.current_password` -> `currentPassword`.
 */
export function formFieldName(apiField: string): string {
  const parts = apiField.split('.')
  if (parts.length > 1 && REQUEST_SCOPES.has(parts[0])) parts.shift()
  return parts.map(camelCase).join('.')
}

/** Acepta `field_errors` de la API y `errors` del backend de demo; ignora lo que no sea texto. */
export function normalizeFieldErrors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'string') continue
    const name = formFieldName(key)
    if (!(name in result)) result[name] = value
  }
  return result
}

/**
 * Los errores por campo con los nombres del formulario cuando no coinciden con los del API:
 * `{ pillar: 'category' }` lleva `pillar` a `category`; `stops.0.pointId` se busca también por `stops`.
 */
export function renameFieldErrors(error: unknown, names: Readonly<Record<string, string>>): unknown {
  if (!(error instanceof ApiError) || Object.keys(error.fieldErrors).length === 0) return error
  const fieldErrors: Record<string, string> = {}
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    const name = names[field] ?? names[field.split('.')[0]] ?? field
    if (!(name in fieldErrors)) fieldErrors[name] = message
  }
  return new ApiError(error.status, error.message, fieldErrors, error.retryAfter)
}

/** `Retry-After` llega en segundos; una fecha HTTP no se usa en esta API. */
export function parseRetryAfter(value: string | null | undefined): number | null {
  if (!value) return null
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : null
}

/** "15 minutos", "40 segundos": para decirle a la persona cuánto esperar. */
export function waitText(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

/** Los mensajes de error no llevan punto final; dentro de un párrafo, sí. */
export function asSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

/** Como `errorMessage`, y en un 429 con `Retry-After` dice cuánto falta para volver a intentar. */
export function errorMessageWithWait(error: unknown): string {
  const message = errorMessage(error)
  if (error instanceof ApiError && error.status === 429 && error.retryAfter) {
    return `${asSentence(message)} Puedes reintentar en ${waitText(error.retryAfter)}.`
  }
  return message
}
