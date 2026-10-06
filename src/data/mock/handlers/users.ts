import { z } from 'zod'
import { todayISO } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import { PERMISSIONS, type User, type UserRole, type UserStatus } from '../../models'
import { userUpdateSchema } from '../../schemas/access.schema'
import type { MockDatabase, MockStaffRole } from '../db'
import { fail, MockHttpError, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'

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

// ── Todas las cuentas ("Todos los usuarios"): solo existe en la demo ────

export const userRoutes = [
  route(
    'GET',
    endpoints.users.list,
    (context) => {
      const role = context.query.get('role') as UserRole | null
      const status = context.query.get('status') as UserStatus | null
      const search = context.query.get('q')?.trim().toLowerCase()
      return context.db.users
        .filter((item) => canSee(context, item))
        .filter((item) => !role || item.role === role)
        .filter((item) => !status || item.status === status)
        .filter((item) => !search || `${item.name} ${item.email}`.toLowerCase().includes(search))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    },
    { permissions: ['users.view', 'staff.manage'] },
  ),
  route(
    'GET',
    endpoints.users.detail(':id'),
    (context) => {
      const target = findUser(context.db, context.params.id)
      if (!canSee(context, target)) throw fail.notFound('No encontramos a esa persona.')
      return target
    },
    { permissions: ['users.view', 'staff.manage'] },
  ),
  route(
    'PATCH',
    endpoints.users.detail(':id'),
    (context) => {
      const { db, params, body } = context
      const actor = requireUser(context)
      const target = findUser(db, params.id)
      const input = parseBody(userUpdateSchema, body)
      if (target.id === actor.id) throw fail.conflict('No puedes cambiar tu propia cuenta desde aquí')

      const isStaff = target.role === 'admin'
      const needed = isStaff ? (['staff.manage'] as const) : (['users.manage'] as const)
      if (!hasPermission(db, actor, needed)) throw fail.forbidden()

      const losesSuperAdmin =
        target.staffRoleId === SUPER_ADMIN &&
        ((input.staffRoleId !== undefined && input.staffRoleId !== SUPER_ADMIN) || input.status === 'suspended')
      if (losesSuperAdmin && activeSuperAdmins(db).length <= 1) {
        throw fail.conflict('Tiene que quedar al menos un super admin activo')
      }

      if (input.staffRoleId !== undefined) {
        if (!isStaff) throw fail.invalid('Sólo el equipo de K\'Plan tiene rol interno')
        target.staffRoleId = findRole(db, input.staffRoleId).id
      }
      if (input.status !== undefined) {
        if (input.status === 'invited' && target.status !== 'invited') throw fail.invalid('Esa persona ya entró al portal')
        target.status = input.status
      }
      return target
    },
    { permissions: ['users.manage', 'staff.manage'] },
  ),
  route(
    'POST',
    endpoints.users.passwordReset(':id'),
    (context) => {
      const target = findUser(context.db, context.params.id)
      if (!canSee(context, target)) throw fail.notFound('No encontramos a esa persona.')
      return undefined
    },
    { permissions: ['users.manage', 'staff.manage'] },
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
      if (target.role !== 'admin') throw new MockHttpError(400, "Esa persona no es del equipo de K'Plan.")
      assertCanChange(db, requireUser(context), target, role.id !== SUPER_ADMIN)
      target.staffRoleId = role.id
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
