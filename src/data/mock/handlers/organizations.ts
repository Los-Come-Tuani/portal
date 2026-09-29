import { endpoints } from '../../api/endpoints'
import { assignStopsSchema, organizationInputSchema } from '../../schemas/admin.schema'
import { fail, MockHttpError, parseBody, requireUser, route } from '../http'
import { findOrganization, hasPermission, isAdmin } from '../services/access'
import { assertStopFree } from '../services/ownership'

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
        const unchanged = fields.every((field) => input[field] === organization[field])
        if (organization.status !== 'pending' || !unchanged) {
          throw new MockHttpError(403, 'Tu rol sólo admite o rechaza organizaciones nuevas')
        }
      }
      Object.assign(organization, input)
      return organization
    },
    { permissions: ['organizations.manage', 'organizations.review'] },
  ),
  route(
    'POST',
    endpoints.organizations.stops(':id'),
    ({ db, params, body }) => {
      const organization = findOrganization(db, params.id)
      if (organization.status !== 'active') throw fail.conflict('Sólo se le asignan lugares a una organización activa')
      const { stopIds } = parseBody(assignStopsSchema, body)
      for (const stopId of stopIds) assertStopFree(db, stopId, { organizationId: organization.id, city: organization.city, field: 'stopIds' })
      organization.stopIds = [...new Set([...organization.stopIds, ...stopIds])]
      return organization
    },
    { permissions: ['organizations.manage'] },
  ),
  route(
    'DELETE',
    endpoints.organizations.stop(':id', ':stopId'),
    ({ db, params }) => {
      const organization = findOrganization(db, params.id)
      const stop = db.stops.find((item) => item.id === params.stopId)
      if (!stop || !organization.stopIds.includes(stop.id)) throw fail.notFound('Ese lugar ya no es de esta organización')
      if (stop.draft) throw fail.conflict('Un borrador se quita rechazando su pedido o su solicitud')
      organization.stopIds = organization.stopIds.filter((id) => id !== stop.id)
      return organization
    },
    { permissions: ['organizations.manage'] },
  ),
]
