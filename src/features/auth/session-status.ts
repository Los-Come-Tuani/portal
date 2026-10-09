import { ApiError } from '@/data/api/errors'

/**
 * Cómo queda la sesión recordada cuando falla `GET /auth/profile/` al abrir el portal. Sólo un
 * rechazo del API (401, 403) dice que no hay sesión; sin conexión, con un 5xx o un 429 no se sabe,
 * y la persona puede reintentar sin perderla.
 */
export function statusAfterProfileFailure(error: unknown): 'anonymous' | 'unavailable' {
  return error instanceof ApiError && (error.status === 401 || error.status === 403) ? 'anonymous' : 'unavailable'
}
