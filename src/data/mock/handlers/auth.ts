import { nowLocalDateTime } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import { isPortalRole, type User } from '../../models'
import { loginSchema } from '../../schemas/admin.schema'
import type { MockDatabase } from '../db'
import { resetDatabase } from '../db'
import { MockHttpError, parseBody, requireUser, route } from '../http'
import { toSessionUser } from '../services/access'

const TOKEN_PREFIX = 'demo.'

/** En la demo el token es el id del usuario; la API real devolverá un JWT. */
export function userFromToken(db: MockDatabase, token: string | null): User | null {
  if (!token?.startsWith(TOKEN_PREFIX)) return null
  const user = db.users.find((item) => item.id === token.slice(TOKEN_PREFIX.length))
  return user && isPortalRole(user.role) && user.status !== 'suspended' ? user : null
}

export const authRoutes = [
  route(
    'POST',
    endpoints.auth.login,
    ({ db, body }) => {
      const input = parseBody(loginSchema, body)
      const user = db.users.find((item) => item.email.toLowerCase() === input.email.trim().toLowerCase())
      if (!user) throw new MockHttpError(401, 'Correo o contraseña incorrectos')
      if (!isPortalRole(user.role)) {
        throw new MockHttpError(403, "Esta cuenta es de la app de K'Plan. Entra desde la app en tu celular.")
      }
      if (user.status === 'suspended') {
        throw new MockHttpError(403, "Tu cuenta está suspendida. Escríbele al equipo de K'Plan para reactivarla.")
      }
      const organization = db.organizations.find((item) => item.id === user.organizationId)
      if (organization?.status === 'suspended') {
        throw new MockHttpError(
          403,
          `La cuenta de ${organization.name} está suspendida. Escríbele al equipo de K'Plan para reactivarla.`,
        )
      }
      if (user.status === 'invited') user.status = 'active'
      user.lastSeenAt = nowLocalDateTime()
      return { token: `${TOKEN_PREFIX}${user.id}`, user: toSessionUser(db, user) }
    },
    { isPublic: true },
  ),
  route('GET', endpoints.auth.me, (context) => toSessionUser(context.db, requireUser(context))),
  route('POST', endpoints.auth.forgotPassword, () => undefined, { isPublic: true }),
  route(
    'POST',
    endpoints.demoReset,
    () => {
      resetDatabase()
      return undefined
    },
    { isPublic: true },
  ),
]
