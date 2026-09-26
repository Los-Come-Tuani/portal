import { nowLocalDateTime } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import type { PlaceProfile, Post } from '../../models'
import { placeProfileInputSchema, postInputSchema } from '../../schemas/profile.schema'
import { stopInputSchema } from '../../schemas/stop.schema'
import type { MockDatabase } from '../db'
import { fail, parseBody, requireUser, route } from '../http'
import { findOwnStop, isAdmin, ownStopIds } from '../services/access'

function emptyProfile(stopId: string): PlaceProfile {
  return {
    stopId,
    offerings: [],
    amenities: [],
    languages: ['Español'],
    contact: { phone: '', whatsapp: '', email: '', website: '', instagram: '', facebook: '' },
    updatedAt: nowLocalDateTime(),
  }
}

function organizationOfStop(db: MockDatabase, stopId: string): string {
  const owner = db.organizations.find((item) => item.stopIds.includes(stopId))
  if (!owner) throw fail.invalid('Ese lugar no pertenece a ninguna organización')
  return owner.id
}

export const placeRoutes = [
  route('GET', endpoints.stops.list, (context) => {
    const user = requireUser(context)
    const { db, query } = context
    const allowed = ownStopIds(db, user)
    const organizationId = query.get('organizationId')
    const ids = query.get('ids')?.split(',')
    const city = query.get('city')
    const organization = organizationId ? db.organizations.find((item) => item.id === organizationId) : null
    const order = organization?.stopIds ?? []
    return db.stops
      .filter((stop) => !allowed || allowed.has(stop.id))
      .filter((stop) => !organization || organization.stopIds.includes(stop.id))
      .filter((stop) => !ids || ids.includes(stop.id))
      .filter((stop) => !city || stop.city === city)
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
  }),
  route('GET', endpoints.stops.detail(':id'), (context) =>
    findOwnStop(context.db, requireUser(context), context.params.id),
  ),
  route('PUT', endpoints.stops.detail(':id'), (context) => {
    const stop = findOwnStop(context.db, requireUser(context), context.params.id)
    const { opensAt, closesAt, ...input } = parseBody(stopInputSchema, context.body)
    Object.assign(stop, input)
    if (opensAt && closesAt) {
      stop.opensAt = opensAt
      stop.closesAt = closesAt
    } else {
      delete stop.opensAt
      delete stop.closesAt
    }
    return stop
  }),
  route('GET', endpoints.stops.profile(':id'), (context) => {
    const stop = findOwnStop(context.db, requireUser(context), context.params.id)
    return context.db.profiles.find((item) => item.stopId === stop.id) ?? emptyProfile(stop.id)
  }),
  route('PUT', endpoints.stops.profile(':id'), (context) => {
    const stop = findOwnStop(context.db, requireUser(context), context.params.id)
    const input = parseBody(placeProfileInputSchema, context.body)
    const profile: PlaceProfile = { ...input, stopId: stop.id, updatedAt: nowLocalDateTime() } as PlaceProfile
    const index = context.db.profiles.findIndex((item) => item.stopId === stop.id)
    if (index >= 0) context.db.profiles[index] = profile
    else context.db.profiles.push(profile)
    return profile
  }),

  route('GET', endpoints.posts.list, (context) => {
    const user = requireUser(context)
    const allowed = ownStopIds(context.db, user)
    const stopId = context.query.get('stopId')
    return context.db.posts
      .filter((post) => !allowed || allowed.has(post.stopId))
      .filter((post) => !stopId || post.stopId === stopId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  }),
  route('POST', endpoints.posts.list, (context) => {
    const user = requireUser(context)
    const input = parseBody(postInputSchema, context.body)
    findOwnStop(context.db, user, input.stopId)
    const post: Post = {
      ...input,
      id: `post-${Date.now().toString(36)}`,
      organizationId: organizationOfStop(context.db, input.stopId),
      publishedAt: nowLocalDateTime(),
    }
    context.db.posts.push(post)
    return post
  }),
  route('PUT', endpoints.posts.detail(':id'), (context) => {
    const user = requireUser(context)
    const post = context.db.posts.find((item) => item.id === context.params.id)
    if (!post) throw fail.notFound('No encontramos esa novedad')
    findOwnStop(context.db, user, post.stopId)
    const input = parseBody(postInputSchema, context.body)
    findOwnStop(context.db, user, input.stopId)
    Object.assign(post, input)
    return post
  }),
  route('DELETE', endpoints.posts.detail(':id'), (context) => {
    const user = requireUser(context)
    const post = context.db.posts.find((item) => item.id === context.params.id)
    if (!post) throw fail.notFound('No encontramos esa novedad')
    if (!isAdmin(user)) findOwnStop(context.db, user, post.stopId)
    context.db.posts = context.db.posts.filter((item) => item.id !== post.id)
    return undefined
  }),
]
