import { z } from 'zod'
import { todayISO } from '@/lib/dates'
import { ApiError } from '../api/errors'
import { PERMISSIONS, type Permission } from '../models/access'
import { ORGANIZATION_KINDS } from '../models/application'
import type { GuideServiceRole } from '../models/guide'
import type { SessionUser, UserRole } from '../models/user'

/** Los papeles que conoce el API; el portal agrupa algunos (ver `ROLE_MAP`). */
const API_ROLES = ['admin', 'alcaldia', 'guia', 'institucion', 'negocio', 'traductor', 'turista'] as const

/** La persona de la sesión tal como la entrega el API (`GET /auth/profile/` y el inicio de sesión). */
export const apiSessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
  username: z.string().nullable(),
  birth_date: z.string().nullable(),
  nationality: z.string(),
  status: z.enum(['pending', 'active', 'suspended', 'expelled', 'closing']),
  verified: z.boolean(),
  role: z.enum(API_ROLES).nullable(),
  groups: z.array(z.object({ id: z.number(), name: z.string() })),
  permissions: z.array(z.string()),
  organization_id: z.string().nullable(),
  /** El negocio, la institución o la alcaldía sobre la que actúa; `verified` es la aprobación del equipo. */
  organization: z
    .object({ id: z.string(), kind: z.enum(ORGANIZATION_KINDS), name: z.string(), verified: z.boolean() })
    .nullish(),
  two_factor: z.object({ enabled: z.boolean(), required: z.boolean() }),
  created_at: z.string(),
})

export type ApiSessionUser = z.infer<typeof apiSessionUserSchema>

/** El inicio de sesión devuelve `{ user }`; si la cuenta tiene 2FA, `{ expires_in }`. */
export const apiLoginResponseSchema = z.object({ user: apiSessionUserSchema })
export const apiChallengeSchema = z.object({ expires_in: z.number() })

const ROLE_MAP: Record<(typeof API_ROLES)[number], { role: UserRole; serviceRole: GuideServiceRole | null }> = {
  admin: { role: 'admin', serviceRole: null },
  negocio: { role: 'negocio', serviceRole: null },
  alcaldia: { role: 'alcaldia', serviceRole: null },
  // El portal todavía no distingue las instituciones de las alcaldías: se tratan igual.
  institucion: { role: 'alcaldia', serviceRole: null },
  guia: { role: 'guia', serviceRole: 'guide' },
  traductor: { role: 'guia', serviceRole: 'translator' },
  turista: { role: 'turista', serviceRole: null },
}

const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set(PERMISSIONS)

function isPermission(value: string): value is Permission {
  return KNOWN_PERMISSIONS.has(value)
}

export const NO_ROLE_MESSAGE = "Tu cuenta todavía no tiene un rol asignado. Escríbele al equipo de K'Plan."

/** Guías, traductores y turistas usan la app; el portal es para negocios, alcaldías y el equipo. */
export const NOT_PORTAL_MESSAGE = "Esta cuenta es de la app de K'Plan. Entra desde la app en tu celular."

/**
 * Del usuario del API al del portal. Lo que el API todavía no tiene (teléfono, ciudad, última
 * conexión) queda vacío. Los permisos son solo del equipo de K'Plan y se filtran a los que el
 * portal conoce: un código ajeno nunca da acceso a una pantalla.
 */
export function toSessionUser(api: ApiSessionUser): SessionUser {
  if (api.role === null) throw new ApiError(403, NO_ROLE_MESSAGE)
  const { role, serviceRole } = ROLE_MAP[api.role]
  // El rol interno del equipo es el grupo de la cuenta.
  const group = role === 'admin' ? api.groups[0] : undefined

  return {
    id: api.id,
    name: api.name,
    email: api.email,
    role,
    organizationId: api.organization_id,
    staffRoleId: group ? String(group.id) : null,
    serviceRole,
    status: api.status === 'suspended' ? 'suspended' : 'active',
    phone: '',
    city: null,
    createdAt: todayISO(new Date(api.created_at)),
    lastSeenAt: null,
    permissions: role === 'admin' ? api.permissions.filter(isPermission) : [],
    staffRoleName: group?.name ?? null,
    twoFactor: api.two_factor,
    organizationRef: api.organization ?? null,
  }
}
