import type { z } from 'zod'
import type { HttpMethod } from '../api/http-client'
import type { Permission, User, UserRole } from '../models'
import type { MockDatabase } from './db'

export class MockHttpError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export const fail = {
  unauthorized: () => new MockHttpError(401, 'Sesión expirada, vuelve a iniciar sesión'),
  forbidden: () => new MockHttpError(403, 'No tienes permiso para hacer esto'),
  notFound: (message = 'No encontramos lo que buscas') => new MockHttpError(404, message),
  conflict: (message: string) => new MockHttpError(409, message),
  gone: (message: string) => new MockHttpError(410, message),
  invalid: (message: string, fieldErrors: Record<string, string> = {}) => new MockHttpError(422, message, fieldErrors),
}

export interface MockContext {
  params: Record<string, string>
  query: URLSearchParams
  body: unknown
  user: User | null
  db: MockDatabase
}

export interface MockRoute {
  method: HttpMethod
  matcher: RegExp
  keys: string[]
  handler: (context: MockContext) => unknown
  isPublic: boolean
  roles?: UserRole[]
  permissions?: Permission[]
}

interface RouteOptions {
  /** Sin sesión (login, recuperar contraseña). */
  isPublic?: boolean
  roles?: UserRole[]
  /** Sólo el equipo de K'Plan con al menos uno de estos permisos. */
  permissions?: Permission[]
}

/** `route('GET', '/api/stops/:id', handler)`: una ruta del backend de demo. */
export function route(
  method: HttpMethod,
  pattern: string,
  handler: (context: MockContext) => unknown,
  options: RouteOptions = {},
): MockRoute {
  const keys: string[] = []
  // Los patrones se arman con endpoints.x.detail(':id'), que codifica los ':'.
  const source = decodeURIComponent(pattern)
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1))
        return '([^/]+)'
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return {
    method,
    matcher: new RegExp(`^${source}$`),
    keys,
    handler,
    isPublic: options.isPublic ?? false,
    roles: options.roles,
    permissions: options.permissions,
  }
}

export function matchRoute(candidate: MockRoute, path: string): Record<string, string> | null {
  const match = candidate.matcher.exec(path)
  if (!match) return null
  return Object.fromEntries(candidate.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]))
}

/** Valida el cuerpo con el mismo esquema Zod que usa el formulario. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (result.success) return result.data
  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message
  }
  throw fail.invalid('Revisa los campos marcados', fieldErrors)
}

export function requireUser(context: MockContext): User {
  if (!context.user) throw fail.unauthorized()
  return context.user
}
