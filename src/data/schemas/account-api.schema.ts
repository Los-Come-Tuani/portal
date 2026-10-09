import { z } from 'zod'
import { todayISO } from '@/lib/dates'
import type { Account, AccountNameInput, AccountStatus, GuideServiceRole, Page, UserRole } from '../models'
import { ORGANIZATION_KINDS } from '../models/application'

/**
 * El directorio de cuentas como lo habla el API (`GET /auth/account/`, docs/roles.md del repo del
 * API, sección "Directorio de cuentas"): `snake_case`. Los ids de los roles del equipo son enteros
 * en el API y textos en el modo demo.
 */

const API_ROLES = ['admin', 'alcaldia', 'guia', 'institucion', 'negocio', 'traductor', 'turista'] as const

const city = z.object({ id: z.string(), code: z.string(), name: z.string() })

export const apiAccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'active', 'suspended', 'expelled', 'closing']),
  verified: z.boolean(),
  created_at: z.string(),
  role: z.enum(API_ROLES).nullable(),
  superuser: z.boolean(),
  staff_role: z.object({ id: z.union([z.number(), z.string()]).transform(String), name: z.string() }).nullable(),
  organization: z.object({ id: z.string(), kind: z.enum(ORGANIZATION_KINDS), name: z.string(), verified: z.boolean() }).nullable(),
  provider: z
    .object({
      id: z.string(),
      status: z.enum(['unaccredited', 'in_review', 'active', 'suspended']),
      services: z.array(z.string()),
    })
    .nullable(),
  city: city.nullable(),
})

export const apiAccountPageSchema = z.object({
  next: z.boolean(),
  previous: z.boolean(),
  elements: z.number(),
  pages: z.number(),
  current: z.number(),
  results: z.array(apiAccountSchema),
})

type ApiAccount = z.infer<typeof apiAccountSchema>

/** Lo que ofrece un prestador, de sus servicios; sin perfil, lo que dice su papel. */
function serviceRoleOf(api: ApiAccount): GuideServiceRole | null {
  const services = api.provider?.services ?? (api.role === 'guia' ? ['guia'] : api.role === 'traductor' ? ['traductor'] : [])
  const guide = services.includes('guia')
  const translator = services.includes('traductor')
  if (guide && translator) return 'both'
  if (translator) return 'translator'
  if (guide) return 'guide'
  return null
}

/**
 * El papel del portal: las instituciones se tratan como alcaldías (como en la sesión) y guías y
 * traductores son uno solo. Sin grupos pero con perfil de prestador, es un guía en revisión.
 */
function roleOf(api: ApiAccount): UserRole | null {
  switch (api.role) {
    case 'institucion':
      return 'alcaldia'
    case 'traductor':
      return 'guia'
    case null:
      return api.provider ? 'guia' : null
    default:
      return api.role
  }
}

/** Una invitación del equipo sin aceptar se ve como tal; el resto de los estados, como vienen. */
function statusOf(api: ApiAccount): AccountStatus | 'invited' {
  return api.status === 'pending' && api.role === 'admin' ? 'invited' : api.status
}

export function toAccount(api: ApiAccount): Account {
  return {
    id: api.id,
    name: api.name,
    firstName: api.first_name,
    lastName: api.last_name,
    email: api.email,
    role: roleOf(api),
    serviceRole: serviceRoleOf(api),
    status: statusOf(api),
    superuser: api.superuser,
    staffRole: api.staff_role,
    organization: api.organization,
    provider: api.provider,
    city: api.city?.name ?? null,
    createdAt: todayISO(new Date(api.created_at)),
  }
}

export function toAccountPage(api: z.infer<typeof apiAccountPageSchema>): Page<Account> {
  return {
    results: api.results.map(toAccount),
    current: api.current,
    pages: api.pages,
    elements: api.elements,
    hasNext: api.next,
    hasPrevious: api.previous,
  }
}

export function accountNameBody(input: AccountNameInput) {
  return { first_name: input.firstName.trim(), last_name: input.lastName.trim() }
}
