import { todayISO } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import type { StaffRole, User, UserRole, UserStatus } from '../../models'
import { staffInviteSchema, staffRoleInputSchema, userUpdateSchema } from '../../schemas/access.schema'
import type { MockDatabase } from '../db'
import { fail, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'

const SUPER_ADMIN = 'role-super-admin'

function findUser(db: MockDatabase, userId: string): User {
  const user = db.users.find((item) => item.id === userId)
  if (!user) throw fail.notFound('No encontramos a esa persona')
  return user
}

function findRole(db: MockDatabase, roleId: string): StaffRole {
  const role = db.staffRoles.find((item) => item.id === roleId)
  if (!role) throw fail.notFound('No encontramos ese rol')
  return role
}

/** Quien sólo administra el equipo ve únicamente al equipo. */
function canSee(context: MockContext, target: User): boolean {
  const user = requireUser(context)
  return hasPermission(context.db, user, ['users.manage']) || target.role === 'admin'
}

function activeSuperAdmins(db: MockDatabase): User[] {
  return db.users.filter((item) => item.staffRoleId === SUPER_ADMIN && item.status !== 'suspended')
}

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
    { permissions: ['users.manage', 'staff.manage'] },
  ),
  route(
    'GET',
    endpoints.users.detail(':id'),
    (context) => {
      const target = findUser(context.db, context.params.id)
      if (!canSee(context, target)) throw fail.notFound('No encontramos a esa persona')
      return target
    },
    { permissions: ['users.manage', 'staff.manage'] },
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
      if (!canSee(context, target)) throw fail.notFound('No encontramos a esa persona')
      return undefined
    },
    { permissions: ['users.manage', 'staff.manage'] },
  ),
  route(
    'POST',
    endpoints.users.staffInvite,
    ({ db, body }) => {
      const input = parseBody(staffInviteSchema, body)
      const email = input.email.trim().toLowerCase()
      if (db.users.some((item) => item.email.toLowerCase() === email)) {
        throw fail.invalid('Revisa el correo', { email: 'Ya hay una cuenta con este correo' })
      }
      const user: User = {
        id: uniqueSlug(`user-${input.name}`, (id) => db.users.some((item) => item.id === id)),
        name: input.name,
        email,
        role: 'admin',
        organizationId: null,
        staffRoleId: findRole(db, input.staffRoleId).id,
        serviceRole: null,
        status: 'invited',
        phone: '',
        city: null,
        createdAt: todayISO(),
        lastSeenAt: null,
      }
      db.users.push(user)
      return user
    },
    { permissions: ['staff.manage'] },
  ),
]

export const staffRoleRoutes = [
  route('GET', endpoints.staffRoles.list, ({ db }) => db.staffRoles, { roles: ['admin'] }),
  route(
    'POST',
    endpoints.staffRoles.list,
    ({ db, body }) => {
      const input = parseBody(staffRoleInputSchema, body)
      if (db.staffRoles.some((item) => item.name.toLowerCase() === input.name.toLowerCase())) {
        throw fail.invalid('Revisa el nombre', { name: 'Ya hay un rol con este nombre' })
      }
      const role: StaffRole = {
        ...input,
        id: uniqueSlug(`role-${input.name}`, (id) => db.staffRoles.some((item) => item.id === id)),
        system: false,
        createdAt: todayISO(),
      }
      db.staffRoles.push(role)
      return role
    },
    { permissions: ['staff.manage'] },
  ),
  route(
    'PUT',
    endpoints.staffRoles.detail(':id'),
    (context) => {
      const { db, params, body } = context
      const actor = requireUser(context)
      const role = findRole(db, params.id)
      if (role.system) throw fail.conflict('El rol de super admin no se edita')
      const input = parseBody(staffRoleInputSchema, body)
      if (db.staffRoles.some((item) => item.id !== role.id && item.name.toLowerCase() === input.name.toLowerCase())) {
        throw fail.invalid('Revisa el nombre', { name: 'Ya hay un rol con este nombre' })
      }
      if (actor.staffRoleId === role.id && !input.permissions.includes('staff.manage')) {
        throw fail.invalid('Revisa los permisos', {
          permissions: 'Tienes este rol: si le quitas "Administrar el equipo" pierdes el acceso a esta pantalla',
        })
      }
      Object.assign(role, input)
      return role
    },
    { permissions: ['staff.manage'] },
  ),
  route(
    'DELETE',
    endpoints.staffRoles.detail(':id'),
    ({ db, params }) => {
      const role = findRole(db, params.id)
      if (role.system) throw fail.conflict('El rol de super admin no se borra')
      const members = db.users.filter((item) => item.staffRoleId === role.id && item.status !== 'suspended').length
      if (members > 0) {
        throw fail.conflict(`${members === 1 ? 'Una persona tiene' : `${members} personas tienen`} este rol: cámbialas de rol primero`)
      }
      db.staffRoles = db.staffRoles.filter((item) => item.id !== role.id)
      db.users.forEach((item) => {
        if (item.staffRoleId === role.id) item.staffRoleId = null
      })
      return undefined
    },
    { permissions: ['staff.manage'] },
  ),
]
