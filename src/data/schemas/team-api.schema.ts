import { z } from 'zod'
import { todayISO } from '@/lib/dates'
import { PERMISSIONS, type Permission, type StaffMember, type StaffRole, type StaffRoleInput } from '../models/access'
import type { StaffInviteInput } from '../models/user'

/**
 * El equipo de K'Plan como lo habla el API (`/auth/staff-*`, docs/roles.md del repo del API).
 * Los ids de los roles son enteros en el API y textos en el modo demo: el portal los trata
 * como texto y los devuelve como vinieron.
 */

const id = z.union([z.number(), z.string()]).transform(String)

export const apiRoleSchema = z.object({
  id,
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.string()),
  members: z.number(),
  requires_two_factor: z.boolean(),
  system: z.boolean(),
  created_at: z.string(),
})

export const apiMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.object({ id, name: z.string() }).nullable(),
  status: z.string(),
  created_at: z.string(),
})

/** La invitación responde la persona y si salió el correo (dentro de la espera de 60 s no sale otro). */
export const apiInviteSchema = apiMemberSchema.extend({ sent: z.boolean() })

const KNOWN: ReadonlySet<string> = new Set(PERMISSIONS)
const isPermission = (value: string): value is Permission => KNOWN.has(value)

const dateOf = (value: string) => todayISO(new Date(value))

export function toRole(api: z.infer<typeof apiRoleSchema>): StaffRole {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    // Un permiso que el portal no conoce nunca abre una pantalla.
    permissions: api.permissions.filter(isPermission),
    system: api.system,
    requiresTwoFactor: api.requires_two_factor,
    members: api.members,
    createdAt: dateOf(api.created_at),
  }
}

/** `pending` es la invitación sin aceptar; una cuenta cerrándose o expulsada ya no entra. */
function toStatus(status: string): StaffMember['status'] {
  if (status === 'active') return 'active'
  if (status === 'pending') return 'invited'
  return 'suspended'
}

export function toMember(api: z.infer<typeof apiMemberSchema>): StaffMember {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    role: api.role,
    status: toStatus(api.status),
    createdAt: dateOf(api.created_at),
  }
}

/** El API pide el id del rol como número; la demo lo usa como texto. */
export const roleReference = (roleId: string): number | string => (/^\d+$/.test(roleId) ? Number(roleId) : roleId)

export function roleBody(input: StaffRoleInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    permissions: input.permissions,
    requires_two_factor: input.requiresTwoFactor,
  }
}

/** El portal pide un solo campo de nombre: lo primero es el nombre y lo demás el apellido. */
export function inviteBody(input: StaffInviteInput) {
  const [firstName = '', ...rest] = input.name.trim().split(/\s+/)
  return {
    email: input.email.trim(),
    first_name: firstName,
    last_name: rest.join(' '),
    role_id: roleReference(input.staffRoleId),
  }
}
