import { expandPermissions, type Organization, type Permission, type SessionUser, type User } from '../../models'
import type { ApiSessionUser } from '../../schemas/session.schema'
import type { MockDatabase, MockStop } from '../db'
import { fail } from '../http'
import { demoTwoFactor } from './demo-two-factor'

export function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

/** Lo que puede hacer alguien del equipo según su rol interno; nada para los demás. */
export function permissionsOf(db: MockDatabase, user: User): Permission[] {
  if (!isAdmin(user) || user.status === 'suspended') return []
  return expandPermissions(db.staffRoles.find((role) => role.id === user.staffRoleId)?.permissions ?? [])
}

export function hasPermission(db: MockDatabase, user: User, anyOf: readonly Permission[]): boolean {
  const granted = permissionsOf(db, user)
  return anyOf.some((permission) => granted.includes(permission))
}

export function assertPermission(db: MockDatabase, user: User, anyOf: readonly Permission[]): void {
  if (!hasPermission(db, user, anyOf)) throw fail.forbidden()
}

export function toSessionUser(db: MockDatabase, user: User): SessionUser {
  return {
    ...user,
    permissions: permissionsOf(db, user),
    staffRoleName: db.staffRoles.find((role) => role.id === user.staffRoleId)?.name ?? null,
    twoFactor: { enabled: demoTwoFactor.get(user.id).enabled, required: false },
    organizationRef: null,
  }
}

/** La persona de la sesión con la forma que entrega el API real (`GET /auth/profile/`). */
export function toApiSessionUser(db: MockDatabase, user: User): ApiSessionUser {
  const roleIndex = db.staffRoles.findIndex((role) => role.id === user.staffRoleId)
  const [firstName = '', ...rest] = user.name.split(' ')
  return {
    id: user.id,
    email: user.email,
    first_name: firstName,
    last_name: rest.join(' '),
    name: user.name,
    username: null,
    birth_date: null,
    nationality: 'NI',
    status: user.status === 'suspended' ? 'suspended' : 'active',
    verified: true,
    role: user.role === 'guia' ? (user.serviceRole === 'translator' ? 'traductor' : 'guia') : user.role,
    groups: roleIndex < 0 ? [] : [{ id: roleIndex + 1, name: db.staffRoles[roleIndex].name }],
    permissions: permissionsOf(db, user),
    organization_id: user.organizationId,
    organization: organizationRefOf(db, user),
    two_factor: { enabled: demoTwoFactor.get(user.id).enabled, required: false },
    created_at: `${user.createdAt}T12:00:00Z`,
  }
}

/** Como el API: la organización de la sesión con su clase y si ya la verificó el equipo. */
function organizationRefOf(db: MockDatabase, user: User): ApiSessionUser['organization'] {
  const organization = db.organizations.find((item) => item.id === user.organizationId)
  if (!organization) return null
  return {
    id: organization.id,
    kind: organization.type === 'negocio' ? 'business' : 'municipality',
    name: organization.name,
    verified: organization.status === 'active',
  }
}

export function findOrganization(db: MockDatabase, organizationId: string): Organization {
  const organization = db.organizations.find((item) => item.id === organizationId)
  if (!organization) throw fail.notFound('No encontramos esa organización')
  return organization
}

/** Los lugares que el usuario puede ver y editar; `null` = todos (admin). */
export function ownStopIds(db: MockDatabase, user: User): Set<string> | null {
  if (isAdmin(user)) return null
  const organization = db.organizations.find((item) => item.id === user.organizationId)
  return new Set(organization?.stopIds ?? [])
}

export function findOwnStop(db: MockDatabase, user: User, stopId: string): MockStop {
  const stop = db.stops.find((item) => item.id === stopId)
  const allowed = ownStopIds(db, user)
  if (!stop || (allowed && !allowed.has(stopId))) throw fail.notFound('No encontramos ese lugar')
  return stop
}

/**
 * La organización a la que aplica un listado. Un negocio o una alcaldía sólo
 * ve lo suyo; el admin puede pedir una organización o todas (`null`).
 */
export function scopeOrganization(user: User, requested: string | null): string | null {
  if (isAdmin(user)) return requested
  if (requested && requested !== user.organizationId) throw fail.forbidden()
  return user.organizationId
}

export function assertCanManage(user: User, organizationId: string | null): void {
  if (isAdmin(user)) return
  if (organizationId === null || organizationId !== user.organizationId) throw fail.forbidden()
}
