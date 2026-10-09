import { describe, expect, it } from 'vitest'
import { ApiError, ERROR_MESSAGES, errorMessageWithWait, formFieldName, normalizeFieldErrors, parseRetryAfter, renameFieldErrors, waitText } from './errors'

describe('formFieldName', () => {
  it('quita de dónde viaja el dato y pasa a camelCase', () => {
    expect(formFieldName('body.current_password')).toBe('currentPassword')
    expect(formFieldName('body.email')).toBe('email')
    expect(formFieldName('query.birth_date')).toBe('birthDate')
    expect(formFieldName('cookies.csrftoken')).toBe('csrftoken')
  })

  it('respeta los campos anidados y los índices', () => {
    expect(formFieldName('body.documents.0.file_url')).toBe('documents.0.fileUrl')
  })

  it('deja igual lo que ya viene como lo conoce el formulario', () => {
    expect(formFieldName('representative.email')).toBe('representative.email')
  })
})

describe('normalizeFieldErrors', () => {
  it('lee los field_errors de la API', () => {
    expect(normalizeFieldErrors({ 'body.current_password': 'Incorrecta', 'body.password': 'Muy corta' })).toEqual({
      currentPassword: 'Incorrecta',
      password: 'Muy corta',
    })
  })

  it('ignora lo que no es texto y lo que no es un objeto', () => {
    expect(normalizeFieldErrors({ 'body.email': 'Inválido', 'body.age': 3, 'body.x': null })).toEqual({ email: 'Inválido' })
    expect(normalizeFieldErrors(null)).toEqual({})
    expect(normalizeFieldErrors(['a'])).toEqual({})
    expect(normalizeFieldErrors(undefined)).toEqual({})
  })

  it('se queda con el primer mensaje cuando dos campos terminan igual', () => {
    expect(normalizeFieldErrors({ 'body.email': 'Primero', 'query.email': 'Segundo' })).toEqual({ email: 'Primero' })
  })
})

describe('renameFieldErrors', () => {
  it('lleva los campos del API a los del formulario, también los anidados', () => {
    const error = new ApiError(400, 'Revisa los campos', { pillar: 'No existe', 'stops.0.pointId': 'Inactiva', title: 'Corto' }, null)
    const renamed = renameFieldErrors(error, { pillar: 'category', stops: 'stopIds' }) as ApiError
    expect(renamed).toBeInstanceOf(ApiError)
    expect(renamed.status).toBe(400)
    expect(renamed.fieldErrors).toEqual({ category: 'No existe', stopIds: 'Inactiva', title: 'Corto' })
  })

  it('deja igual lo que no es un error de la API o no trae campos', () => {
    const plain = new Error('x')
    const bare = new ApiError(409, 'Conflicto')
    expect(renameFieldErrors(plain, { a: 'b' })).toBe(plain)
    expect(renameFieldErrors(bare, { a: 'b' })).toBe(bare)
  })
})

describe('parseRetryAfter', () => {
  it('lee segundos', () => {
    expect(parseRetryAfter('900')).toBe(900)
    expect(parseRetryAfter('0')).toBe(0)
    expect(parseRetryAfter('1.2')).toBe(2)
  })

  it('devuelve null si no hay un número', () => {
    expect(parseRetryAfter(null)).toBeNull()
    expect(parseRetryAfter(undefined)).toBeNull()
    expect(parseRetryAfter('')).toBeNull()
    expect(parseRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBeNull()
    expect(parseRetryAfter('-5')).toBeNull()
  })
})

describe('waitText', () => {
  it('dice segundos hasta un minuto y minutos después', () => {
    expect(waitText(1)).toBe('1 segundo')
    expect(waitText(40)).toBe('40 segundos')
    expect(waitText(60)).toBe('1 minuto')
    expect(waitText(61)).toBe('2 minutos')
    expect(waitText(900)).toBe('15 minutos')
  })
})

describe('errorMessageWithWait', () => {
  it('suma cuánto esperar cuando la API lo pide', () => {
    const error = new ApiError(429, 'Se bloqueó el acceso.', {}, 900)
    expect(errorMessageWithWait(error)).toBe('Se bloqueó el acceso. Puedes reintentar en 15 minutos.')
  })

  it('cierra la oración del mensaje antes de sumar la espera', () => {
    const error = new ApiError(429, ERROR_MESSAGES.tooManyRequests, {}, 40)
    expect(errorMessageWithWait(error)).toBe('Demasiados intentos, espera un momento e intenta de nuevo. Puedes reintentar en 40 segundos.')
  })

  it('deja el mensaje igual si no es un 429 o no trae espera', () => {
    expect(errorMessageWithWait(new ApiError(401, 'Credenciales inválidas.'))).toBe('Credenciales inválidas.')
    expect(errorMessageWithWait(new ApiError(429, 'Muchos intentos.'))).toBe('Muchos intentos.')
  })

  it('usa el mensaje genérico con un error que no es de la API', () => {
    expect(errorMessageWithWait(new Error('x'))).toBe('Algo salió mal, intenta de nuevo')
  })
})
