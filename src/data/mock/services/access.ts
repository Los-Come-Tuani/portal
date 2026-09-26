import type { Organization, Permission, SessionUser, Stop, User } from '../../models'
import type { MockDatabase } from '../db'
import { fail } from '../http'

export function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

/** Lo que puede hacer alguien del equipo según su rol interno; nada para los demás. */
export function permissionsOf(db: MockDatabase, user: User): Permission[] {
  if (!isAdmin(user) || user.status === 'suspended') return []
  return db.staffRoles.find((role) => role.id === user.staffRoleId)?.permissions ?? []
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

export function findOwnStop(db: MockDatabase, user: User, stopId: string): Stop {
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
