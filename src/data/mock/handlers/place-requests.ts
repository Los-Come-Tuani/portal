import { nowLocalDateTime } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import type { PlaceRequest, Stop } from '../../models'
import { placeRequestDecisionSchema, placeRequestInputSchema } from '../../schemas/place-request.schema'
import type { MockDatabase } from '../db'
import { fail, parseBody, requireUser, route } from '../http'
import { hasPermission, isAdmin } from '../services/access'

const REVIEWERS = ['organizations.review', 'organizations.manage'] as const

function ownerOf(db: MockDatabase, stopId: string) {
  return db.organizations.find((item) => item.stopIds.includes(stopId))
}

export const placeRequestRoutes = [
  route('GET', endpoints.placeRequests.list, (context) => {
    const user = requireUser(context)
    const status = context.query.get('status')
    const reviewer = isAdmin(user) && hasPermission(context.db, user, REVIEWERS)
    if (isAdmin(user) && !reviewer) throw fail.forbidden()
    return context.db.placeRequests
      .filter((item) => reviewer || item.organizationId === user.organizationId)
      .filter((item) => !status || item.status === status)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  }),
  route(
    'POST',
    endpoints.placeRequests.list,
    (context) => {
      const user = requireUser(context)
      const { db } = context
      const organization = db.organizations.find((item) => item.id === user.organizationId)
      if (!organization || organization.status !== 'active') throw fail.conflict('Tu organización tiene que estar aprobada para pedir otro lugar')
      const input = parseBody(placeRequestInputSchema, context.body)
      const now = nowLocalDateTime()
      let stop: Stop
      if (input.kind === 'claim') {
        const found = db.stops.find((item) => item.id === input.stopId && !item.draft)
        if (!found) throw fail.invalid('Revisa el lugar', { stopId: 'Ese lugar ya no está en la app' })
        const owner = ownerOf(db, found.id)
        if (owner) throw fail.invalid('Revisa el lugar', { stopId: `${found.name} ya lo administra ${owner.name}` })
        if (db.placeRequests.some((item) => item.stopId === found.id && item.status === 'pending')) {
          throw fail.invalid('Revisa el lugar', { stopId: 'Alguien ya pidió este lugar: el equipo lo está revisando' })
        }
        stop = found
      } else {
        const inCity = db.stops.find((item) => item.city === organization.city)
        stop = {
          id: uniqueSlug(`${organization.city}-${input.newPlace.name}`, (id) => db.stops.some((item) => item.id === id)),
          name: input.newPlace.name,
          category: input.newPlace.category,
          city: organization.city,
          address: input.newPlace.address,
          duration: '45 min',
          rating: 0,
          reviewsCount: 0,
          hasBadge: false,
          description: '',
          tip: '',
          images: [],
          coordinates: inCity?.coordinates ?? { latitude: 12.1328, longitude: -86.2504 },
          draft: true,
        }
        db.stops.push(stop)
        organization.stopIds.push(stop.id)
      }
      const request: PlaceRequest = {
        id: uniqueSlug(`pedido-${stop.id}`, (id) => db.placeRequests.some((item) => item.id === id)),
        organizationId: organization.id,
        organizationName: organization.name,
        requestedByName: user.name,
        kind: input.kind,
        stopId: stop.id,
        stopName: stop.name,
        note: input.note,
        status: 'pending',
        requestedAt: now,
        decidedAt: null,
        decidedByName: null,
        decisionNote: '',
      }
      db.placeRequests.push(request)
      return request
    },
    { roles: ['negocio', 'alcaldia'] },
  ),
  route(
    'POST',
    endpoints.placeRequests.decision(':id'),
    (context) => {
      const actor = requireUser(context)
      const { db } = context
      const request = db.placeRequests.find((item) => item.id === context.params.id)
      if (!request) throw fail.notFound('No encontramos ese pedido')
      if (request.status !== 'pending') throw fail.conflict('Este pedido ya se decidió')
      const input = parseBody(placeRequestDecisionSchema, context.body)
      const organization = db.organizations.find((item) => item.id === request.organizationId)
      const stop = db.stops.find((item) => item.id === request.stopId)
      if (!organization || !stop) throw fail.notFound('La organización o el lugar ya no existen')

      if (input.decision === 'approved') {
        if (request.kind === 'claim') {
          const owner = ownerOf(db, stop.id)
          if (owner && owner.id !== organization.id) throw fail.conflict(`${stop.name} ya lo administra ${owner.name}`)
          if (!organization.stopIds.includes(stop.id)) organization.stopIds.push(stop.id)
        } else {
          delete stop.draft
        }
      } else if (request.kind === 'new') {
        organization.stopIds = organization.stopIds.filter((id) => id !== stop.id)
        db.stops = db.stops.filter((item) => item.id !== stop.id)
      }
      Object.assign(request, {
        status: input.decision,
        decidedAt: nowLocalDateTime(),
        decidedByName: actor.name,
        decisionNote: input.note,
      })
      return request
    },
    { permissions: [...REVIEWERS] },
  ),
]
