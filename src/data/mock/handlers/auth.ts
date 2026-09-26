import { endpoints } from '../../api/endpoints'
import type { MockDatabase } from '../db'
import { resetDatabase } from '../db'
import { MockHttpError, parseBody, requireUser, route } from '../http'
import { loginSchema } from '../../schemas/admin.schema'
import type { User } from '../../models'

const TOKEN_PREFIX = 'demo.'

/** En la demo el token es el id del usuario; la API real devolverá un JWT. */
export function userFromToken(db: MockDatabase, token: string | null): User | null {
  if (!token?.startsWith(TOKEN_PREFIX)) return null
  return db.users.find((user) => user.id === token.slice(TOKEN_PREFIX.length)) ?? null
}

export const authRoutes = [
  route(
    'POST',
    endpoints.auth.login,
    ({ db, body }) => {
      const input = parseBody(loginSchema, body)
      const user = db.users.find((item) => item.email.toLowerCase() === input.email.trim().toLowerCase())
      if (!user) throw new MockHttpError(401, 'Correo o contraseña incorrectos')
      const organization = db.organizations.find((item) => item.id === user.organizationId)
      if (organization?.status === 'suspended') {
        throw new MockHttpError(
          403,
          `La cuenta de ${organization.name} está suspendida. Escríbele al equipo de K'Plan para reactivarla.`,
        )
      }
      return { token: `${TOKEN_PREFIX}${user.id}`, user }
    },
    { isPublic: true },
  ),
  route('GET', endpoints.auth.me, (context) => requireUser(context)),
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
