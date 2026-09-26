import type { Organization, Stop, User } from '../../models'
import type { MockDatabase } from '../db'
import { fail } from '../http'

export function isAdmin(user: User): boolean {
  return user.role === 'admin'
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
