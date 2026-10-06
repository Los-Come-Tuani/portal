import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import { isPortalRole, type User } from '../../models'
import { loginSchema } from '../../schemas/admin.schema'
import { newPasswordSchema } from '../../schemas/auth.schema'
import type { MockDatabase } from '../db'
import { resetDatabase } from '../db'
import { fail, MockHttpError, parseBody, requireUser, route } from '../http'
import { toApiSessionUser } from '../services/access'
import { demoSession } from '../services/demo-session'
import { DEMO_CODE, demoTwoFactor } from '../services/demo-two-factor'
import { rejectionNote } from './admissions'

/** Quién tiene la sesión abierta en la demo (el equivalente a la cookie de la API real). */
export function userFromSession(db: MockDatabase): User | null {
  const id = demoSession.userId()
  if (!id) return null
  const user = db.users.find((item) => item.id === id)
  return user && isPortalRole(user.role) && user.status !== 'suspended' ? user : null
}

const CHALLENGE_SECONDS = 300

const codeBody = z.object({ code: z.string().trim().min(1, { error: 'Escribe el código' }) })
const resetBody = z.object({
  email: z.email({ error: 'Escribe un correo válido' }),
  code: z.string().trim().min(1, { error: 'Escribe el código' }),
  password: newPasswordSchema,
})
const changeBody = z.object({
  current_password: z.string().min(1, { error: 'Escribe tu contraseña actual' }),
  password: newPasswordSchema,
})
const disableBody = z.object({
  code: z.string().trim().min(1, { error: 'Escribe el código' }),
  password: z.string().min(1, { error: 'Escribe tu contraseña' }),
})

const INVALID_CODE = 'El código proporcionado no es válido.'

function openSession(db: MockDatabase, user: User) {
  if (user.status === 'invited') user.status = 'active'
  user.lastSeenAt = nowLocalDateTime()
  demoSession.open(user.id)
  return { user: toApiSessionUser(db, user) }
}

export const authRoutes = [
  // El token CSRF no hace falta en la demo: no hay cookies que proteger.
  route('GET', endpoints.auth.csrf, () => undefined, { isPublic: true }),
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
      const rejected = organization?.status === 'suspended' ? rejectionNote(db, organization.id) : null
      if (rejected !== null) {
        throw new MockHttpError(
          403,
          `La solicitud de ${organization?.name} no fue aprobada${rejected ? `: ${rejected}` : '.'} Puedes escribirle al equipo de K'Plan.`,
        )
      }
      if (organization?.status === 'suspended') {
        throw new MockHttpError(
          403,
          `La cuenta de ${organization.name} está suspendida. Escríbele al equipo de K'Plan para reactivarla.`,
        )
      }
      if (demoTwoFactor.get(user.id).enabled) {
        demoSession.startChallenge(user.id)
        return { expires_in: CHALLENGE_SECONDS }
      }
      return openSession(db, user)
    },
    { isPublic: true },
  ),
  route(
    'POST',
    endpoints.auth.twoFactor,
    ({ db, body }) => {
      const { code } = parseBody(codeBody, body)
      const userId = demoSession.challengeUserId()
      const user = db.users.find((item) => item.id === userId)
      if (!user) throw new MockHttpError(401, 'El código venció. Vuelve a escribir tu correo y contraseña.')
      if (!demoTwoFactor.accepts(user.id, code)) throw new MockHttpError(401, INVALID_CODE)
      return openSession(db, user)
    },
    { isPublic: true },
  ),
  route(
    'POST',
    endpoints.auth.refresh,
    ({ user }) => {
      if (!user) throw fail.unauthorized()
      return undefined
    },
    { isPublic: true },
  ),
  route(
    'POST',
    endpoints.auth.logout,
    () => {
      demoSession.close()
      return undefined
    },
    { isPublic: true },
  ),
  route('GET', endpoints.auth.profile, (context) => toApiSessionUser(context.db, requireUser(context))),
  route('POST', endpoints.auth.passwordForgot, () => undefined, { isPublic: true }),
  route(
    'POST',
    endpoints.auth.passwordReset,
    ({ body }) => {
      const input = parseBody(resetBody, body)
      if (input.code !== DEMO_CODE) throw new MockHttpError(400, INVALID_CODE, { code: INVALID_CODE })
      return undefined
    },
    { isPublic: true },
  ),
  route(
    'POST',
    endpoints.auth.staffAccept,
    ({ db, body }) => {
      const input = parseBody(resetBody, body)
      const invited = db.users.find(
        (item) => item.email.toLowerCase() === input.email.trim().toLowerCase() && item.status === 'invited',
      )
      // Como el API: un correo sin invitación y un código malo dan la misma respuesta.
      if (!invited || input.code !== DEMO_CODE) throw new MockHttpError(400, INVALID_CODE, { code: INVALID_CODE })
      invited.status = 'active'
      return undefined
    },
    { isPublic: true },
  ),
  route(
    'POST',
    endpoints.auth.passwordChange,
    ({ body }) => {
      parseBody(changeBody, body)
      // Como la API real: cambiar la contraseña cierra todas las sesiones.
      demoSession.close()
      return undefined
    },
  ),
  route('POST', endpoints.auth.sessionRevoke, () => {
    demoSession.close()
    return undefined
  }),
  route('GET', endpoints.auth.twoFactorStatus, (context) => {
    const state = demoTwoFactor.get(requireUser(context).id)
    return {
      confirmed_at: state.confirmedAt,
      enabled: state.enabled,
      pending: state.pending,
      recovery_codes: state.recoveryCodes.length,
    }
  }),
  route('POST', endpoints.auth.twoFactorSetup, (context) => {
    const user = requireUser(context)
    if (demoTwoFactor.get(user.id).enabled) throw fail.conflict('El segundo factor de autenticación ya está activo.')
    return demoTwoFactor.start(user.id, user.email)
  }),
  route('POST', endpoints.auth.twoFactorConfirm, (context) => {
    const user = requireUser(context)
    const { code } = parseBody(codeBody, context.body)
    if (!demoTwoFactor.get(user.id).pending) {
      throw new MockHttpError(400, 'No hay una configuración de segundo factor asociada a esta cuenta.')
    }
    if (code !== DEMO_CODE) throw new MockHttpError(400, INVALID_CODE, { code: INVALID_CODE })
    return { codes: demoTwoFactor.confirm(user.id, new Date().toISOString()) }
  }),
  route('POST', endpoints.auth.twoFactorRecovery, (context) => {
    const user = requireUser(context)
    const { code } = parseBody(codeBody, context.body)
    if (!demoTwoFactor.get(user.id).enabled) throw new MockHttpError(400, 'El segundo factor de autenticación no está activo.')
    if (!demoTwoFactor.accepts(user.id, code)) throw new MockHttpError(400, INVALID_CODE, { code: INVALID_CODE })
    return { codes: demoTwoFactor.regenerate(user.id) }
  }),
  route('POST', endpoints.auth.twoFactorDisable, (context) => {
    const user = requireUser(context)
    const input = parseBody(disableBody, context.body)
    if (!demoTwoFactor.get(user.id).enabled) throw new MockHttpError(400, 'El segundo factor de autenticación no está activo.')
    if (!demoTwoFactor.accepts(user.id, input.code)) throw new MockHttpError(400, INVALID_CODE, { code: INVALID_CODE })
    demoTwoFactor.disable(user.id)
    return undefined
  }),
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
