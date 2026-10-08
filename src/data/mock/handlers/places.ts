import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { clockToInput, inputToClock, toDurationText } from '@/lib/time'
import { endpoints } from '../../api/endpoints'
import { categoryOfPillar, PILLAR_CODES, STOP_CATEGORIES, type PlaceProfile } from '../../models'
import type { MockDatabase, MockPost, MockStop } from '../db'
import { fail, MockHttpError, paginate, parseBody, requireUser, route } from '../http'
import { hasPermission } from '../services/access'
import { CITIES } from '../services/application-catalog'
import { isClaimed, ownerOf } from '../services/ownership'
import {
  actorOrganization,
  assertCanRetire,
  assertNotInPublishedCircuits,
  checkPhotos,
  editableStop,
  isActive,
  visibleStop,
  visibleStops,
  wireCity,
  wireInstant,
  wirePhoto,
  wirePlace,
  wireStop,
} from '../services/places'

const PILLARS = STOP_CATEGORIES.map((label) => ({ id: `pillar-${PILLAR_CODES[label]}`, code: PILLAR_CODES[label], label }))

const clock = z.string().regex(/^\d{2}:\d{2}$/, { error: 'Usa el formato HH:MM.' })

const placeFields = {
  pillar: z.string().refine((code) => PILLARS.some((pillar) => pillar.code === code), { error: 'Ese pilar no existe.' }),
  name: z.string().trim().min(3).max(80),
  description: z.string().max(2000),
  address: z.string().max(140),
  latitude: z.number().min(10.7).max(15.1),
  longitude: z.number().min(-87.7).max(-82.6),
  opens_at: clock.nullable(),
  closes_at: clock.nullable(),
  visit_minutes: z.number().int().min(5).max(720),
  tip: z.string().max(140),
  has_badge: z.boolean(),
  images: z.array(z.string().min(1)).max(8),
}

const createBody = z.object({
  ...placeFields,
  city_id: z.string().optional(),
  description: placeFields.description.default(''),
  address: placeFields.address.default(''),
  opens_at: placeFields.opens_at.default(null),
  closes_at: placeFields.closes_at.default(null),
  visit_minutes: placeFields.visit_minutes.default(30),
  tip: placeFields.tip.default(''),
  has_badge: placeFields.has_badge.default(false),
  images: placeFields.images.default([]),
})

const patchBody = z.object({ ...placeFields, active: z.boolean() }).partial()

const profileBody = z.object({
  offerings: z.array(z.object({ name: z.string().trim().min(1).max(80), description: z.string().max(300).default(''), price: z.number().int().min(0).nullable().default(null) })).max(24),
  amenities: z.array(z.string().min(1).max(40)).max(20),
  languages: z.array(z.string().min(1).max(40)).max(12),
  contact: z.object({
    phone: z.string().max(20),
    whatsapp: z.string().max(20),
    email: z.string().max(254),
    website: z.string().max(200),
    instagram: z.string().max(40),
    facebook: z.string().max(80),
  }),
})

const postFields = {
  title: z.string().trim().min(4).max(80),
  body: z.string().trim().min(20).max(500),
  image_key: z.string().min(1).nullable(),
  visible: z.boolean(),
}
const postCreateBody = z.object({ ...postFields, place_id: z.string().min(1), image_key: postFields.image_key.default(null), visible: postFields.visible.default(true) })
const postPatchBody = z.object(postFields).partial()

const ownerBody = z.object({ kind: z.enum(['business', 'institution', 'municipality']).nullish(), id: z.string().nullish() })

function checkHours(opens: string | null, closes: string | null) {
  if ((opens === null) !== (closes === null)) throw fail.invalid('Revisa los campos marcados', { closes_at: 'Van las dos horas o ninguna.' })
  if (opens !== null && closes !== null && closes <= opens) {
    throw fail.invalid('Revisa los campos marcados', { closes_at: 'La hora de cierre tiene que ser después de la de apertura.' })
  }
}

/** Las horas y el tiempo de visita del API, como los guarda la demo (el formato de la app). */
function applyHours(stop: MockStop, opens: string | null, closes: string | null) {
  if (opens && closes) {
    stop.opensAt = inputToClock(opens)
    stop.closesAt = inputToClock(closes)
  } else {
    delete stop.opensAt
    delete stop.closesAt
  }
}

const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const byName = (a: MockStop, b: MockStop) => a.name.localeCompare(b.name, 'es')

function emptyProfile(stopId: string): Omit<PlaceProfile, 'updatedAt'> & { updatedAt: null } {
  return {
    stopId,
    offerings: [],
    amenities: [],
    languages: ['Español'],
    contact: { phone: '', whatsapp: '', email: '', website: '', instagram: '', facebook: '' },
    updatedAt: null,
  }
}

function wireProfile(profile: PlaceProfile) {
  return {
    offerings: profile.offerings.map(({ id, name, description, price }) => ({ id, name, description, price })),
    amenities: profile.amenities,
    languages: profile.languages,
    contact: profile.contact,
    updated_at: profile.updatedAt ? wireInstant(profile.updatedAt) : null,
  }
}

function wirePost(db: MockDatabase, post: MockPost) {
  return {
    id: post.id,
    place_id: post.stopId,
    title: post.title,
    body: post.body,
    image: post.image ? wirePhoto(db, post.image) : null,
    visible: post.status === 'published',
    published_at: wireInstant(post.publishedAt),
  }
}

function findPost(db: MockDatabase, postId: string): MockPost {
  const post = db.posts.find((item) => item.id === postId)
  if (!post) throw fail.notFound('No encontramos esa novedad.')
  return post
}

export const placeRoutes = [
  route('GET', endpoints.catalog.pillars, () => PILLARS, { isPublic: true }),

  // ── Lo que ve la app, sin sesión ──
  route(
    'GET',
    endpoints.stops.list,
    ({ db, query }) => {
      const city = query.get('city')
      const pillar = query.get('pillar')
      const search = fold(query.get('search')?.trim() ?? '')
      const ids = query.get('ids')?.split(',')
      const shown = db.stops
        .filter(isActive)
        .filter((stop) => !city || wireCity(stop.city).code === city)
        .filter((stop) => !pillar || PILLAR_CODES[stop.category] === pillar)
        .filter((stop) => !search || fold(stop.name).includes(search))
        .filter((stop) => !ids || ids.includes(stop.id))
        .sort(byName)
        .map((stop) => wireStop(db, stop))
      return paginate(shown, query)
    },
    { isPublic: true },
  ),
  route(
    'GET',
    endpoints.stops.detail(':id'),
    ({ db, params }) => {
      const stop = db.stops.find((item) => item.id === params.id && isActive(item))
      if (!stop) throw fail.notFound('No encontramos ese lugar.')
      const profile = db.profiles.find((item) => item.stopId === stop.id) ?? emptyProfile(stop.id)
      const posts = db.posts
        .filter((post) => post.stopId === stop.id && post.status === 'published')
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 10)
      return { ...wireStop(db, stop), profile: wireProfile(profile), posts: posts.map((post) => wirePost(db, post)) }
    },
    { isPublic: true },
  ),
  // No existe en el API: los lugares sin dueño de una ciudad para un pedido de lugar.
  route(
    'GET',
    endpoints.placeRequests.availableStops,
    ({ db, query, user }) => {
      const city = query.get('city')
      const mine = user?.organizationId ?? null
      return db.stops
        .filter((stop) => isActive(stop) && !ownerOf(db, stop.id) && !isClaimed(db, stop.id, mine) && (!city || stop.city === city))
        .sort(byName)
        .map((stop) => wireStop(db, stop))
    },
    { isPublic: true },
  ),

  // ── El portal ──
  route('GET', endpoints.place.list, (context) => {
    const { db, query } = context
    const user = requireUser(context)
    const cityId = query.get('city_id')
    const pillar = query.get('pillar')
    const ownerKind = query.get('owner_kind')
    const ownerId = query.get('owner_id')
    const active = query.get('active')
    const search = fold(query.get('search')?.trim() ?? '')
    const shown = visibleStops(db, user)
      .filter((stop) => !cityId || wireCity(stop.city).id === cityId)
      .filter((stop) => !pillar || PILLAR_CODES[stop.category] === pillar)
      .filter((stop) => {
        if (!ownerKind) return true
        const owner = wireStop(db, stop).owner
        if (ownerKind === 'none') return owner === null
        return owner?.kind === ownerKind && (!ownerId || owner.id === ownerId)
      })
      .filter((stop) => active === null || String(isActive(stop)) === active)
      .filter((stop) => !search || fold(stop.name).includes(search))
      .sort(byName)
      .map((stop) => wirePlace(db, stop))
    return paginate(shown, query)
  }),
  route('POST', endpoints.place.list, (context) => {
    const { db, body } = context
    const user = requireUser(context)
    const input = parseBody(createBody, body)
    const manager = hasPermission(db, user, ['places.manage'])
    const organization = actorOrganization(db, user)
    let city: string
    if (manager) {
      const found = CITIES.find((item) => item.id === input.city_id)
      if (!found) throw fail.invalid('Revisa los campos marcados', { city_id: input.city_id ? 'Esa ciudad no existe.' : 'Elige la ciudad del lugar.' })
      city = found.name
    } else if (organization?.type === 'alcaldia') {
      if (input.city_id && input.city_id !== wireCity(organization.city).id) {
        throw fail.invalid('Revisa los campos marcados', { city_id: 'Solo puedes crear lugares en tu ciudad.' })
      }
      city = organization.city
    } else {
      throw fail.forbidden()
    }
    if (input.has_badge && !manager) throw fail.invalid('Revisa los campos marcados', { has_badge: 'La insignia de un lugar la activa el equipo.' })
    checkHours(input.opens_at, input.closes_at)
    const stop: MockStop = {
      id: uniqueSlug(`${city}-${input.name}`, (id) => db.stops.some((item) => item.id === id)),
      name: input.name,
      category: categoryOfPillar(input.pillar),
      city,
      address: input.address,
      duration: toDurationText(input.visit_minutes),
      rating: 0,
      reviewsCount: 0,
      hasBadge: input.has_badge,
      description: input.description,
      tip: input.tip,
      images: checkPhotos(db, input.images, [], 'images'),
      coordinates: { latitude: input.latitude, longitude: input.longitude },
    }
    applyHours(stop, input.opens_at, input.closes_at)
    db.stops.push(stop)
    // La alcaldía queda como dueña de lo que crea; lo del equipo queda sin dueño.
    if (!manager && organization) organization.stopIds.push(stop.id)
    return wirePlace(db, stop)
  }),
  route('GET', endpoints.place.detail(':id'), (context) => wirePlace(context.db, visibleStop(context.db, requireUser(context), context.params.id))),
  route('PATCH', endpoints.place.detail(':id'), (context) => {
    const { db, body, params } = context
    const user = requireUser(context)
    const stop = editableStop(db, user, params.id)
    const input = parseBody(patchBody, body)
    const manager = hasPermission(db, user, ['places.manage'])
    if (input.has_badge !== undefined && input.has_badge !== stop.hasBadge && !manager) {
      throw fail.invalid('Revisa los campos marcados', { has_badge: 'La insignia de un lugar la activa el equipo.' })
    }
    if (input.active !== undefined && input.active !== isActive(stop)) {
      assertCanRetire(db, user, stop)
      if (!input.active) assertNotInPublishedCircuits(db, stop)
    }
    if (input.opens_at !== undefined || input.closes_at !== undefined) {
      const opens = input.opens_at !== undefined ? input.opens_at : clockToInput(stop.opensAt) || null
      const closes = input.closes_at !== undefined ? input.closes_at : clockToInput(stop.closesAt) || null
      checkHours(opens, closes)
      applyHours(stop, opens, closes)
    }
    if (input.images !== undefined) stop.images = checkPhotos(db, input.images, stop.images, 'images')
    if (input.pillar !== undefined) stop.category = categoryOfPillar(input.pillar)
    if (input.name !== undefined) stop.name = input.name
    if (input.description !== undefined) stop.description = input.description
    if (input.address !== undefined) stop.address = input.address
    if (input.tip !== undefined) stop.tip = input.tip
    if (input.visit_minutes !== undefined) stop.duration = toDurationText(input.visit_minutes)
    if (input.latitude !== undefined) stop.coordinates = { ...stop.coordinates, latitude: input.latitude }
    if (input.longitude !== undefined) stop.coordinates = { ...stop.coordinates, longitude: input.longitude }
    if (input.has_badge !== undefined) stop.hasBadge = input.has_badge
    if (input.active === true) delete stop.retired
    if (input.active === false) stop.retired = true
    return wirePlace(db, stop)
  }),
  route('DELETE', endpoints.place.detail(':id'), (context) => {
    const { db, params } = context
    const user = requireUser(context)
    const stop = editableStop(db, user, params.id)
    assertCanRetire(db, user, stop)
    assertNotInPublishedCircuits(db, stop)
    stop.retired = true
    return undefined
  }),
  route('PUT', endpoints.place.owner(':id'), (context) => {
    const { db, body, params } = context
    const user = requireUser(context)
    if (!hasPermission(db, user, ['places.manage', 'organizations.manage'])) throw fail.forbidden()
    const stop = db.stops.find((item) => item.id === params.id)
    if (!stop) throw fail.notFound('No encontramos ese lugar.')
    const input = parseBody(ownerBody, body)
    if (!input.kind !== !input.id) throw fail.invalid('Revisa los campos marcados', { id: 'Di la clase de organización y cuál, o ninguna de las dos.' })
    let target = null
    if (input.kind && input.id) {
      target = db.organizations.find((item) => item.id === input.id && item.status === 'active')
      if (!target) throw fail.invalid('Revisa los campos marcados', { id: 'No encontramos esa organización verificada.' })
      if (target.city !== stop.city) throw fail.invalid('Revisa los campos marcados', { id: 'La organización es de otra ciudad.' })
      if (target.type === 'negocio' && target.stopIds.some((id) => id !== stop.id)) throw new MockHttpError(409, 'Ese comercio ya tiene su lugar.')
    }
    for (const organization of db.organizations) organization.stopIds = organization.stopIds.filter((id) => id !== stop.id)
    if (target) target.stopIds.push(stop.id)
    return wirePlace(db, stop)
  }),

  route('GET', endpoints.place.profile(':id'), (context) => {
    const stop = visibleStop(context.db, requireUser(context), context.params.id)
    return wireProfile(context.db.profiles.find((item) => item.stopId === stop.id) ?? emptyProfile(stop.id))
  }),
  route('PUT', endpoints.place.profile(':id'), (context) => {
    const stop = editableStop(context.db, requireUser(context), context.params.id)
    const input = parseBody(profileBody, context.body)
    const stamp = Date.now().toString(36)
    const profile: PlaceProfile = {
      stopId: stop.id,
      offerings: input.offerings.map((offering, index) => ({ ...offering, id: `of-${stamp}-${index}` })),
      amenities: [...new Set(input.amenities)] as PlaceProfile['amenities'],
      languages: [...new Set(input.languages)],
      contact: input.contact,
      updatedAt: nowLocalDateTime(),
    }
    const index = context.db.profiles.findIndex((item) => item.stopId === stop.id)
    if (index >= 0) context.db.profiles[index] = profile
    else context.db.profiles.push(profile)
    return wireProfile(profile)
  }),

  route('GET', endpoints.post.list, (context) => {
    const { db, query } = context
    const visible = new Set(visibleStops(db, requireUser(context)).map((stop) => stop.id))
    const placeId = query.get('place_id')
    const shown = db.posts
      .filter((post) => visible.has(post.stopId) && (!placeId || post.stopId === placeId))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map((post) => wirePost(db, post))
    return paginate(shown, query)
  }),
  route('POST', endpoints.post.list, (context) => {
    const { db, body } = context
    const input = parseBody(postCreateBody, body)
    const stop = editableStop(db, requireUser(context), input.place_id)
    const post: MockPost = {
      id: `post-${Date.now().toString(36)}`,
      stopId: stop.id,
      title: input.title,
      body: input.body,
      image: input.image_key ? checkPhotos(db, [input.image_key], [], 'image_key')[0] : '',
      publishedAt: nowLocalDateTime(),
      status: input.visible ? 'published' : 'hidden',
    }
    db.posts.push(post)
    return wirePost(db, post)
  }),
  route('PATCH', endpoints.post.detail(':id'), (context) => {
    const { db, body, params } = context
    const user = requireUser(context)
    const post = findPost(db, params.id)
    visibleStop(db, user, post.stopId)
    if (!hasPermission(db, user, ['content.moderate'])) editableStop(db, user, post.stopId)
    const input = parseBody(postPatchBody, body)
    if (input.title !== undefined) post.title = input.title
    if (input.body !== undefined) post.body = input.body
    if (input.visible !== undefined) post.status = input.visible ? 'published' : 'hidden'
    if (input.image_key !== undefined) post.image = input.image_key ? checkPhotos(db, [input.image_key], post.image ? [post.image] : [], 'image_key')[0] : ''
    return wirePost(db, post)
  }),
  route('DELETE', endpoints.post.detail(':id'), (context) => {
    const { db, params } = context
    const user = requireUser(context)
    const post = findPost(db, params.id)
    visibleStop(db, user, post.stopId)
    if (!hasPermission(db, user, ['content.moderate'])) editableStop(db, user, post.stopId)
    db.posts = db.posts.filter((item) => item.id !== post.id)
    return undefined
  }),
]
