import { endpoints } from '../../api/endpoints'
import { organizationInputSchema } from '../../schemas/admin.schema'
import type { MockDatabase } from '../db'
import { fail, MockHttpError, parseBody, requireUser, route } from '../http'
import { findOrganization, hasPermission, isAdmin } from '../services/access'

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

/** No hay alta directa: una organización entra con una solicitud (postulación o alta asistida). */
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
    'PUT',
    endpoints.organizations.detail(':id'),
    (context) => {
      const { db, params, body } = context
      const organization = findOrganization(db, params.id)
      const input = parseBody(organizationInputSchema, body)
      if (!hasPermission(db, requireUser(context), ['organizations.manage'])) {
        const fields = ['type', 'name', 'kind', 'city', 'contactName', 'contactEmail', 'contactPhone'] as const
        const unchanged =
          fields.every((field) => input[field] === organization[field]) &&
          [...input.stopIds].sort().join() === [...organization.stopIds].sort().join()
        if (organization.status !== 'pending' || !unchanged) {
          throw new MockHttpError(403, 'Tu rol sólo admite o rechaza organizaciones nuevas')
        }
      }
      assertStopsAvailable(db, input.stopIds, organization.id)
      Object.assign(organization, input)
      return organization
    },
    { permissions: ['organizations.manage', 'organizations.review'] },
  ),
]
