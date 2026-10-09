import { z } from 'zod'
import { todayISO } from '@/lib/dates'
import { slugify, uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import { PERMISSIONS, type User } from '../../models'
import type { MockDatabase, MockStaffRole } from '../db'
import { fail, MockHttpError, paginate, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'
import { CITIES, cityByName } from '../services/application-catalog'
import type { MockProvider } from '../services/providers'

const SUPER_ADMIN = 'role-super-admin'

function findUser(db: MockDatabase, userId: string): User {
  const user = db.users.find((item) => item.id === userId)
  if (!user) throw fail.notFound('No encontramos a esa persona.')
  return user
}

function findRole(db: MockDatabase, roleId: string): MockStaffRole {
  const role = db.staffRoles.find((item) => item.id === roleId)
  if (!role) throw fail.notFound('No encontramos ese rol.')
  return role
}

/** Quien sólo administra el equipo ve únicamente al equipo. */
function canSee(context: MockContext, target: User): boolean {
  const user = requireUser(context)
  return hasPermission(context.db, user, ['users.view']) || target.role === 'admin'
}

function activeSuperAdmins(db: MockDatabase): User[] {
  return db.users.filter((item) => item.staffRoleId === SUPER_ADMIN && item.status === 'active')
}

const field = (status: number, message: string, name: string) => new MockHttpError(status, message, { [name]: message })

// ── El directorio de cuentas, con el formato del API (docs/roles.md) ────

/** Como el API: un guía cuya solicitud sigue en revisión todavía no tiene grupo, ni papel. */
function apiRoleOf(user: User, provider: MockProvider | undefined): string | null {
  if (user.role !== 'guia') return user.role
  if (provider) {
    if (provider.status === 'unaccredited' || provider.status === 'in_review') return null
    return provider.services.includes('guia') ? 'guia' : 'traductor'
  }
  return user.serviceRole === 'translator' ? 'traductor' : 'guia'
}

function wireCity(name: string | null | undefined) {
  if (!name) return null
  const city = cityByName(name)
  return city ? { id: city.id, code: city.code, name: city.name } : { id: `city-${slugify(name)}`, code: slugify(name), name }
}

function wireAccount(db: MockDatabase, user: User) {
  const staffRole = db.staffRoles.find((item) => item.id === user.staffRoleId)
  const organization = db.organizations.find((item) => item.id === user.organizationId)
  const provider = db.providers.find((item) => item.userId === user.id)
  const providerCity = provider?.cityId ? CITIES.find((city) => city.id === provider.cityId)?.name : undefined
  const [firstName = '', ...rest] = user.name.split(' ')
  return {
    id: user.id,
    email: user.email,
    first_name: firstName,
    last_name: rest.join(' '),
    name: user.name,
    status: user.status === 'invited' ? 'pending' : user.status,
    verified: user.status !== 'invited',
    created_at: `${user.createdAt}T12:00:00Z`,
    role: apiRoleOf(user, provider),
    superuser: false,
    staff_role: user.role === 'admin' && staffRole ? { id: staffRole.id, name: staffRole.name } : null,
    organization: organization
      ? {
          id: organization.id,
          kind: organization.type === 'negocio' ? 'business' : 'municipality',
          name: organization.name,
          verified: organization.status === 'active',
        }
      : null,
    provider: provider ? { id: provider.id, status: provider.status, services: provider.services } : null,
    city: wireCity(organization?.city ?? providerCity ?? user.city),
  }
}

/** Por nombre, sin importar tildes, o por correo. */
const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const nameBody = z
  .object({
    first_name: z.string().trim().min(1).max(100).optional(),
    last_name: z.string().trim().max(100).optional(),
    email: z.unknown().optional(),
  })
  .refine((value) => value.email === undefined, { error: 'El correo no se cambia aquí.', path: ['email'] })

export const userRoutes = [
  route(
    'GET',
    endpoints.auth.accounts,
    (context) => {
      const { db, query } = context
      const role = query.get('role')
      const status = query.get('status')
      const search = fold(query.get('search')?.trim() ?? '')
      const shown = db.users
        .filter((item) => canSee(context, item))
        .filter((item) => !search || fold(`${item.name} ${item.email}`).includes(search))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map((item) => wireAccount(db, item))
        .filter((item) => !role || item.role === role)
        .filter((item) => !status || item.status === status)
      return paginate(shown, query)
    },
    { permissions: ['users.view', 'staff.manage'] },
  ),
  route(
    'GET',
    endpoints.auth.account(':id'),
    (context) => {
      const target = findUser(context.db, context.params.id)
      if (!canSee(context, target)) throw fail.notFound('No encontramos a esa persona.')
      return wireAccount(context.db, target)
    },
    { permissions: ['users.view', 'staff.manage'] },
  ),
  route(
    'PATCH',
    endpoints.auth.account(':id'),
    (context) => {
      const { db, params, body } = context
      const actor = requireUser(context)
      const target = findUser(db, params.id)
      if (!canSee(context, target)) throw fail.notFound('No encontramos a esa persona.')
      if (target.id === actor.id) throw new MockHttpError(403, 'Tu nombre se cambia desde tu perfil.')
      const needed = target.role === 'admin' ? (['staff.manage'] as const) : (['users.manage'] as const)
      if (!hasPermission(db, actor, needed)) throw fail.forbidden()
      const input = parseBody(nameBody, body)
      const [firstName = '', ...rest] = target.name.split(' ')
      target.name = `${input.first_name ?? firstName} ${input.last_name ?? rest.join(' ')}`.trim()
      return wireAccount(db, target)
    },
    { permissions: ['users.manage', 'staff.manage'] },
  ),
  route(
    'POST',
    endpoints.auth.userPasswordReset,
    (context) => {
      const { user_id: userId } = parseBody(z.object({ user_id: z.string().min(1) }), context.body)
      const target = findUser(context.db, userId)
      if (!canSee(context, target)) throw fail.notFound('No encontramos a esa persona.')
      return undefined
    },
    { permissions: ['users.manage'] },
  ),
]

// ── El equipo, con el formato del API (docs/roles.md del repo del API) ───

function wireRole(db: MockDatabase, role: MockStaffRole) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    members: db.users.filter((user) => user.staffRoleId === role.id).length,
    requires_two_factor: role.requiresTwoFactor ?? true,
    system: role.system,
    created_at: `${role.createdAt}T12:00:00Z`,
  }
}

function wireMember(db: MockDatabase, user: User) {
  const role = db.staffRoles.find((item) => item.id === user.staffRoleId)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role ? { id: role.id, name: role.name } : null,
    status: user.status === 'invited' ? 'pending' : user.status,
    created_at: `${user.createdAt}T12:00:00Z`,
  }
}

const roleBody = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(''),
  permissions: z.array(z.string()).max(64).default([]),
  requires_two_factor: z.boolean().default(true),
})

const inviteBody = z.object({
  email: z.email(),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().max(100).default(''),
  role_id: z.union([z.string(), z.number()]).transform(String),
})

/** Como el API: entre un correo de invitación y el siguiente a la misma persona hay un minuto. */
const RESEND_AFTER_MS = 60_000
const lastInviteAt = new Map<string, number>()

function sendInvite(email: string): boolean {
  const now = Date.now()
  const last = lastInviteAt.get(email)
  if (last !== undefined && now - last < RESEND_AFTER_MS) return false
  lastInviteAt.set(email, now)
  return true
}

const userBody = z.object({ user_id: z.string().min(1) })
const userRoleBody = userBody.extend({ role_id: z.union([z.string(), z.number()]).transform(String) })
const userStatusBody = userBody.extend({ status: z.enum(['active', 'suspended']) })

function validPermissions(requested: string[]): string[] {
  const unknown = requested.filter((permission) => !(PERMISSIONS as readonly string[]).includes(permission))
  if (unknown.length > 0) throw field(400, `Permisos desconocidos: ${unknown.join(', ')}.`, 'permissions')
  return [...new Set(requested)].sort()
}

function assertFreeName(db: MockDatabase, name: string, except?: string) {
  if (db.staffRoles.some((item) => item.id !== except && item.name.toLowerCase() === name.toLowerCase())) {
    throw field(409, 'Ya hay un rol con ese nombre.', 'name')
  }
}

/** Una persona del equipo que ya no podría deshacerlo, o el último super admin activo. */
function assertCanChange(db: MockDatabase, actor: User, target: User, losesSuperAdmin: boolean) {
  if (target.id === actor.id) throw new MockHttpError(403, 'No puedes cambiar tu propia cuenta desde aquí.')
  if (losesSuperAdmin && target.staffRoleId === SUPER_ADMIN && activeSuperAdmins(db).length <= 1) {
    throw fail.conflict('Tiene que quedar al menos una persona activa con el rol de super admin.')
  }
}

/** Como el API: entra al equipo una cuenta activa que no es de una organización ni de un guía o traductor. */
function assertCanJoin(db: MockDatabase, target: User) {
  if (target.status !== 'active') throw fail.conflict('Solo una cuenta activa entra al equipo.')
  if (target.organizationId || target.role === 'negocio' || target.role === 'alcaldia') {
    throw fail.conflict('Esa cuenta es de una organización: con un rol del equipo dejaría de ver sus pantallas. Invita a la persona al equipo con otro correo.')
  }
  if (target.role === 'guia' || db.providers.some((item) => item.userId === target.id)) {
    throw fail.conflict('Esa cuenta es de un guía o traductor: con un rol del equipo dejaría de ver sus pantallas. Invita a la persona al equipo con otro correo.')
  }
}

export const staffRoleRoutes = [
  route('GET', endpoints.auth.staffRoles, ({ db }) => db.staffRoles.map((role) => wireRole(db, role)), {
    permissions: ['staff.manage', 'users.view'],
  }),
  route(
    'POST',
    endpoints.auth.staffRoles,
    ({ db, body }) => {
      const input = parseBody(roleBody, body)
      assertFreeName(db, input.name)
      const role: MockStaffRole = {
        id: uniqueSlug(`role-${input.name}`, (id) => db.staffRoles.some((item) => item.id === id)),
        name: input.name,
        description: input.description,
        permissions: validPermissions(input.permissions) as MockStaffRole['permissions'],
        requiresTwoFactor: input.requires_two_factor,
        system: false,
        createdAt: todayISO(),
      }
      db.staffRoles.push(role)
      return wireRole(db, role)
    },
    { permissions: ['staff.manage'] },
  ),
  route(
    'PUT',
    endpoints.auth.staffRole(':id'),
    (context) => {
      const { db, params, body } = context
      const actor = requireUser(context)
      const role = findRole(db, params.id)
      if (role.system) throw new MockHttpError(403, 'Los roles de sistema no se editan ni se borran.')
      const input = parseBody(roleBody, body)
      assertFreeName(db, input.name, role.id)
      const permissions = validPermissions(input.permissions)
      if (actor.staffRoleId === role.id && !permissions.includes('staff.manage')) {
        throw new MockHttpError(403, 'Tienes este rol: si le quitas "Administrar el equipo" pierdes el acceso a esta pantalla.')
      }
      Object.assign(role, {
        name: input.name,
        description: input.description,
        permissions,
        requiresTwoFactor: input.requires_two_factor,
      })
      return wireRole(db, role)
    },
    { permissions: ['staff.manage'] },
  ),
  route(
    'DELETE',
    endpoints.auth.staffRole(':id'),
    ({ db, params }) => {
      const role = findRole(db, params.id)
      if (role.system) throw new MockHttpError(403, 'Los roles de sistema no se editan ni se borran.')
      if (db.users.some((item) => item.staffRoleId === role.id)) {
        throw fail.conflict('Este rol tiene personas: cámbialas de rol antes de borrarlo.')
      }
      db.staffRoles = db.staffRoles.filter((item) => item.id !== role.id)
      return undefined
    },
    { permissions: ['staff.manage'] },
  ),

  route(
    'GET',
    endpoints.auth.staffMembers,
    ({ db }) =>
      db.users
        .filter((user) => user.role === 'admin')
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map((user) => wireMember(db, user)),
    { permissions: ['staff.manage', 'users.view'] },
  ),
  route(
    'POST',
    endpoints.auth.staffInvite,
    ({ db, body }) => {
      const input = parseBody(inviteBody, body)
      const role = findRole(db, input.role_id)
      const email = input.email.trim().toLowerCase()
      const existing = db.users.find((item) => item.email.toLowerCase() === email)
      // Como el API: a una invitación sin aceptar se le cambia el rol y se le manda otro código.
      if (existing) {
        if (existing.status !== 'invited') throw field(409, 'Ya hay una cuenta con este correo.', 'email')
        existing.staffRoleId = role.id
        return { ...wireMember(db, existing), sent: sendInvite(email) }
      }
      const name = `${input.first_name} ${input.last_name}`.trim()
      const user: User = {
        id: uniqueSlug(`user-${name}`, (id) => db.users.some((item) => item.id === id)),
        name,
        email,
        role: 'admin',
        organizationId: null,
        staffRoleId: role.id,
        serviceRole: null,
        status: 'invited',
        phone: '',
        city: null,
        createdAt: todayISO(),
        lastSeenAt: null,
      }
      db.users.push(user)
      return { ...wireMember(db, user), sent: sendInvite(email) }
    },
    { permissions: ['staff.manage'] },
  ),
  route(
    'POST',
    endpoints.auth.userRole,
    (context) => {
      const { db, body } = context
      const input = parseBody(userRoleBody, body)
      const target = findUser(db, input.user_id)
      const role = findRole(db, input.role_id)
      if (target.role !== 'admin') assertCanJoin(db, target)
      assertCanChange(db, requireUser(context), target, role.id !== SUPER_ADMIN)
      target.role = 'admin'
      target.staffRoleId = role.id
      return wireMember(db, target)
    },
    { permissions: ['staff.manage'] },
  ),
  route(
    'POST',
    endpoints.auth.staffRemove,
    (context) => {
      const { db, body } = context
      const target = findUser(db, parseBody(userBody, body).user_id)
      if (target.role !== 'admin') throw new MockHttpError(400, "Esa persona no es del equipo de K'Plan.")
      assertCanChange(db, requireUser(context), target, true)
      // La demo no guarda qué papel tenía antes: queda como turista.
      target.role = 'turista'
      target.staffRoleId = null
      return wireMember(db, target)
    },
    { permissions: ['staff.manage'] },
  ),
  route(
    'POST',
    endpoints.auth.userStatus,
    (context) => {
      const { db, body } = context
      const input = parseBody(userStatusBody, body)
      const target = findUser(db, input.user_id)
      if (target.status === 'invited') throw fail.conflict('Una invitación sin aceptar no tiene acceso que cambiar.')
      assertCanChange(db, requireUser(context), target, input.status === 'suspended')
      target.status = input.status
      return wireMember(db, target)
    },
    { permissions: ['users.manage'] },
  ),
]
