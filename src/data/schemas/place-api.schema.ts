import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { clockToInput, inputToClock, parseDuration, toDurationText } from '@/lib/time'
import {
  AMENITIES,
  categoryOfPillar,
  PILLAR_CODES,
  type AmenityId,
  type NewStopInput,
  type Page,
  type PlaceProfile,
  type PlaceQr,
  type PlaceProfileInput,
  type Post,
  type PostInput,
  type Stop,
  type StopInput,
} from '../models'
import { ORGANIZATION_KINDS } from '../models/application'

/**
 * Lugares, fichas y novedades como los habla el API (`place/`, `post/` y la ruta pública `stop/`,
 * docs/territorio.md del repo del API): `snake_case`, horas `"HH:MM"` y el tiempo de visita en
 * minutos. El portal los muestra como la app: `"8:30 a.m."` y `"1 h 30 min"`.
 */

const image = z.object({ key: z.string(), url: z.string().nullable() })
const city = z.object({ id: z.string(), code: z.string(), name: z.string() })

const page = <T extends z.ZodType>(item: T) =>
  z.object({ next: z.boolean(), previous: z.boolean(), elements: z.number(), pages: z.number(), current: z.number(), results: z.array(item) })

/** Un lugar como lo ve la app (`GET stop/`): sin lo que solo administra el portal. */
export const apiStopSchema = z.object({
  id: z.string(),
  name: z.string(),
  pillar: z.object({ code: z.string(), label: z.string() }),
  city,
  address: z.string(),
  description: z.string(),
  tip: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  visit_minutes: z.number(),
  has_badge: z.boolean(),
  rating: z.number(),
  reviews_count: z.number(),
  images: z.array(image),
  owner: z.object({ kind: z.enum(ORGANIZATION_KINDS), id: z.string(), name: z.string() }).nullable(),
})

/** Un lugar del portal (`GET place/`): si está en la app y en cuántos circuitos publicados está. */
export const apiPlaceSchema = apiStopSchema.extend({
  active: z.boolean(),
  created_at: z.string(),
  published_circuits: z.number(),
})

export const apiPlacePageSchema = page(apiPlaceSchema)
export const apiStopPageSchema = page(apiStopSchema)

export const apiProfileSchema = z.object({
  offerings: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), price: z.number().nullable() })),
  amenities: z.array(z.string()),
  languages: z.array(z.string()),
  contact: z.object({
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    website: z.string(),
    instagram: z.string(),
    facebook: z.string(),
  }),
  updated_at: z.string().nullable(),
})

export const apiPostSchema = z.object({
  id: z.string(),
  place_id: z.string(),
  title: z.string(),
  body: z.string(),
  image: image.nullable(),
  visible: z.boolean(),
  published_at: z.string(),
})

export const apiPostPageSchema = page(apiPostSchema)

export const apiPillarSchema = z.object({ id: z.string(), code: z.string(), label: z.string() })

/** El QR de la insignia de un lugar (`GET place/{id}/qr/`, docs/agenda-y-recompensas.md). */
export const apiPlaceQrSchema = z.object({
  point_id: z.string(),
  payload: z.string(),
  token: z.string(),
  value: z.number(),
  active: z.boolean(),
})

export function toPlaceQr(api: z.infer<typeof apiPlaceQrSchema>): PlaceQr {
  return { pointId: api.point_id, payload: api.payload, token: api.token, value: api.value, active: api.active }
}

/** Los campos del API que en el formulario del portal se llaman distinto. */
export const PLACE_FORM_FIELDS = {
  pillar: 'category',
  visitMinutes: 'duration',
  latitude: 'coordinates.latitude',
  longitude: 'coordinates.longitude',
} as const

export const POST_FORM_FIELDS = { imageKey: 'image', visible: 'status', placeId: 'stopId' } as const

type ApiStop = z.infer<typeof apiStopSchema>
type ApiPlace = z.infer<typeof apiPlaceSchema>

/** `"08:30"` → `"8:30 a.m."`; sin hora, nada. */
const toClock = (value: string | null) => (value ? inputToClock(value.slice(0, 5)) : undefined)

/** `"8:30 a.m."` → `"08:30"`; sin hora, `null`. */
const fromClock = (value: string | undefined) => (value ? clockToInput(value) || null : null)

export function toStop(api: ApiStop | ApiPlace): Stop {
  const opensAt = toClock(api.opens_at)
  const closesAt = toClock(api.closes_at)
  return {
    id: api.id,
    name: api.name,
    category: categoryOfPillar(api.pillar.code),
    city: api.city.name,
    cityId: api.city.id,
    address: api.address,
    // Sin horario (o con uno a medias) es un lugar que no cierra, como en la app.
    ...(opensAt && closesAt ? { opensAt, closesAt } : {}),
    duration: toDurationText(api.visit_minutes),
    rating: api.rating,
    reviewsCount: api.reviews_count,
    hasBadge: api.has_badge,
    description: api.description,
    tip: api.tip,
    images: api.images,
    coordinates: { latitude: api.latitude, longitude: api.longitude },
    // La ruta pública solo entrega los activos.
    active: 'active' in api ? api.active : true,
    owner: api.owner,
    publishedCircuits: 'published_circuits' in api ? api.published_circuits : 0,
  }
}

export function toStopPage(api: { next: boolean; previous: boolean; elements: number; pages: number; current: number; results: (ApiStop | ApiPlace)[] }): Page<Stop> {
  return {
    results: api.results.map(toStop),
    current: api.current,
    pages: api.pages,
    elements: api.elements,
    hasNext: api.next,
    hasPrevious: api.previous,
  }
}

/** Lo que edita su dueño, con los nombres del API. Las fotos van por su clave. */
export function placeBody(input: StopInput) {
  return {
    pillar: PILLAR_CODES[input.category],
    name: input.name.trim(),
    address: input.address.trim(),
    description: input.description.trim(),
    tip: input.tip.trim(),
    latitude: input.coordinates.latitude,
    longitude: input.coordinates.longitude,
    opens_at: fromClock(input.opensAt),
    closes_at: fromClock(input.closesAt),
    visit_minutes: parseDuration(input.duration),
    images: input.images.map((photo) => photo.key),
  }
}

/** Sin ciudad, el API lo crea en la de la alcaldía que lo pide. */
export function newPlaceBody(input: NewStopInput) {
  return {
    ...(input.cityId ? { city_id: input.cityId } : {}),
    pillar: PILLAR_CODES[input.category],
    name: input.name.trim(),
    address: input.address.trim(),
    latitude: input.coordinates.latitude,
    longitude: input.coordinates.longitude,
  }
}

const KNOWN_AMENITIES: ReadonlySet<string> = new Set(AMENITIES.map((amenity) => amenity.id))
const isAmenity = (value: string): value is AmenityId => KNOWN_AMENITIES.has(value)

export function toProfile(stopId: string, api: z.infer<typeof apiProfileSchema>): PlaceProfile {
  return {
    stopId,
    offerings: api.offerings.map((offering) => ({ ...offering })),
    amenities: api.amenities.filter(isAmenity),
    languages: api.languages,
    contact: api.contact,
    updatedAt: api.updated_at ? nowLocalDateTime(new Date(api.updated_at)) : null,
  }
}

/** La ficha completa: el API la reemplaza. Las ofertas nuevas no llevan id. */
export function profileBody(input: PlaceProfileInput) {
  return {
    offerings: input.offerings.map((offering) => ({ name: offering.name.trim(), description: offering.description.trim(), price: offering.price })),
    amenities: input.amenities,
    languages: input.languages,
    contact: {
      phone: input.contact.phone.trim(),
      whatsapp: input.contact.whatsapp.trim(),
      email: input.contact.email.trim(),
      website: input.contact.website.trim(),
      instagram: input.contact.instagram.trim(),
      facebook: input.contact.facebook.trim(),
    },
  }
}

export function toPost(api: z.infer<typeof apiPostSchema>): Post {
  return {
    id: api.id,
    stopId: api.place_id,
    title: api.title,
    body: api.body,
    image: api.image,
    publishedAt: nowLocalDateTime(new Date(api.published_at)),
    status: api.visible ? 'published' : 'hidden',
  }
}

/** Crear lleva el lugar; corregir, no. Sin foto, la clave va nula y el API la quita. */
export function postBody(input: PostInput, mode: 'create' | 'update') {
  return {
    ...(mode === 'create' ? { place_id: input.stopId } : {}),
    title: input.title.trim(),
    body: input.body.trim(),
    image_key: input.image?.key ?? null,
    visible: input.status === 'published',
  }
}
