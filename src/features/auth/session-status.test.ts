import { describe, expect, it } from 'vitest'
import { ApiError, ERROR_MESSAGES } from '@/data/api/errors'
import { statusAfterProfileFailure } from './session-status'

describe('statusAfterProfileFailure', () => {
  it('un rechazo del API deja a la persona sin sesión', () => {
    expect(statusAfterProfileFailure(new ApiError(401, ERROR_MESSAGES.sessionExpired))).toBe('anonymous')
    expect(statusAfterProfileFailure(new ApiError(403, 'Esta cuenta no entra al portal.'))).toBe('anonymous')
  })

  it('sin conexión, con un error del servidor o un 429 se puede reintentar', () => {
    expect(statusAfterProfileFailure(new ApiError(0, ERROR_MESSAGES.offline))).toBe('unavailable')
    expect(statusAfterProfileFailure(new ApiError(0, ERROR_MESSAGES.timeout))).toBe('unavailable')
    expect(statusAfterProfileFailure(new ApiError(429, ERROR_MESSAGES.tooManyRequests, {}, 60))).toBe('unavailable')
    expect(statusAfterProfileFailure(new ApiError(500, ERROR_MESSAGES.server))).toBe('unavailable')
    expect(statusAfterProfileFailure(new ApiError(503, ERROR_MESSAGES.server))).toBe('unavailable')
  })

  it('un error que no es del API tampoco cierra la sesión', () => {
    expect(statusAfterProfileFailure(new TypeError('x is undefined'))).toBe('unavailable')
  })
})
