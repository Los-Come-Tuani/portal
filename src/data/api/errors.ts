/** Los mismos textos que la app, para que el portal y la app se lean igual. */
export const ERROR_MESSAGES = {
  generic: 'Algo salió mal, intenta de nuevo',
  offline: 'No hay conexión a internet',
  sessionExpired: 'Sesión expirada, vuelve a iniciar sesión',
  forbidden: 'No tienes permiso para hacer esto',
  notFound: 'No encontramos lo que buscas',
} as const

export class ApiError extends Error {
  readonly status: number
  /** Errores por campo que devuelve la API al validar un formulario. */
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return ERROR_MESSAGES.generic
}
