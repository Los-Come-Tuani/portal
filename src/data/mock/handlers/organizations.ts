import { todayISO } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import type { Organization } from '../../models'
import { organizationInputSchema } from '../../schemas/admin.schema'
import type { MockDatabase } from '../db'
import { fail, parseBody, requireUser, route } from '../http'
import { findOrganization, isAdmin } from '../services/access'

function assertStopsAvailable(db: MockDatabase, stopIds: string[], organizationId: string | null) {
  for (const stopId of stopIds) {
    if (!db.stops.some((stop) => stop.id === stopId)) throw fail.invalid(`No existe el lugar ${stopId}`)
    const owner = db.organizations.find((item) => item.id !== organizationId && item.stopIds.includes(stopId))
    if (owner) {
      throw fail.invalid('Revisa los lugares', {
        stopIds: `${db.stops.find((stop) => stop.id === stopId)?.name} ya es de ${owner.name}`,
      })
    }
  }
}

export const organizationRoutes = [
  route(
    'GET',
    endpoints.organizations.list,
    ({ db, query }) => {
      const type = query.get('type')
      const status = query.get('status')
      const search = query.get('q')?.toLowerCase()
      return db.organizations
        .filter((item) => !type || item.type === type)
        .filter((item) => !status || item.status === status)
        .filter((item) => !search || `${item.name} ${item.city} ${item.kind}`.toLowerCase().includes(search))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    },
    { roles: ['admin'] },
  ),
  route('GET', endpoints.organizations.detail(':id'), (context) => {
    const user = requireUser(context)
    const organization = findOrganization(context.db, context.params.id)
    if (!isAdmin(user) && user.organizationId !== organization.id) throw fail.forbidden()
    return organization
  }),
  route(
    'POST',
    endpoints.organizations.list,
    ({ db, body }) => {
      const input = parseBody(organizationInputSchema, body)
      assertStopsAvailable(db, input.stopIds, null)
      const organization: Organization = {
        ...input,
        id: uniqueSlug(`org-${input.name}`, (id) => db.organizations.some((item) => item.id === id)),
        joinedAt: todayISO(),
      }
      db.organizations.push(organization)
      return organization
    },
    { roles: ['admin'] },
  ),
  route(
    'PUT',
    endpoints.organizations.detail(':id'),
    ({ db, params, body }) => {
      const organization = findOrganization(db, params.id)
      const input = parseBody(organizationInputSchema, body)
      assertStopsAvailable(db, input.stopIds, organization.id)
      Object.assign(organization, input)
      return organization
    },
    { roles: ['admin'] },
  ),
]
