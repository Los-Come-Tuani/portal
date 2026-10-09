import { z } from 'zod'
import { durationShortText } from '@/lib/circuits'
import { formatDuration } from '@/lib/format'
import { clockToInput, inputToClock } from '@/lib/time'
import {
  CIRCUIT_CATEGORIES,
  CIRCUIT_CATEGORY_CODES,
  CIRCUIT_DIFFICULTIES,
  CIRCUIT_DIFFICULTY_CODES,
  CREATIVE_BONUS_BADGES,
  type Circuit,
  type CircuitInput,
  type Departure,
  type Page,
} from '../models'
import { apiStopSchema, toStop } from './place-api.schema'

/**
 * Los circuitos oficiales como los habla el API (`official-circuit/`, la ruta pública `circuit/` y
 * las salidas de guía `official-circuit/{id}/departure/`; docs/territorio.md y docs/servicios.md del repo del
 * API): `snake_case`, códigos en inglés, horas `"HH:MM"` y las fotos por su clave. El portal los
 * muestra como la app: "Ciudad", "Fácil", `"8:30 a.m."`.
 */

const image = z.object({ key: z.string(), url: z.string().nullable() })
const city = z.object({ id: z.string(), code: z.string(), name: z.string() })

const page = <T extends z.ZodType>(item: T) =>
  z.object({ next: z.boolean(), previous: z.boolean(), elements: z.number(), pages: z.number(), current: z.number(), results: z.array(item) })

const CATEGORY_CODES = Object.values(CIRCUIT_CATEGORY_CODES) as [string, ...string[]]
const DIFFICULTY_CODES = Object.values(CIRCUIT_DIFFICULTY_CODES) as [string, ...string[]]

/** Un circuito de una lista (`GET official-circuit/` o `GET circuit/`): sin sus paradas, con `stop_ids`. */
export const apiCircuitSchema = z.object({
  id: z.string(),
  kind: z.enum(['kplan', 'creative', 'private']),
  status: z.enum(['draft', 'published', 'unpublished', 'retired']),
  city,
  municipality: z.object({ id: z.string(), name: z.string() }).nullable(),
  title: z.string(),
  short_title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  category: z.enum(CATEGORY_CODES),
  difficulty: z.enum(DIFFICULTY_CODES),
  travel_mode: z.enum(['walking', 'vehicle']),
  price_adult: z.number(),
  price_child: z.number(),
  recommendations: z.string(),
  includes: z.string(),
  notes: z.string(),
  meeting_point: z.string(),
  meeting_latitude: z.number(),
  meeting_longitude: z.number(),
  start_times: z.array(z.string()),
  bonus_badges: z.number(),
  booking_mode: z.enum(['private', 'group']),
  available_from: z.string().nullable(),
  available_until: z.string().nullable(),
  version: z.number(),
  rating: z.number(),
  reviews_count: z.number(),
  images: z.array(image),
  stop_ids: z.array(z.string()),
  badges: z.number(),
  duration_minutes: z.number(),
  created_at: z.string(),
  published_at: z.string().nullable(),
})

export const apiCircuitStopSchema = z.object({
  order: z.number(),
  point: apiStopSchema,
  directions: z.string(),
  leg_minutes: z.number().nullable(),
})

/** Uno con sus paradas (`GET official-circuit/{id}/`): cada una con el lugar completo. */
export const apiCircuitDetailSchema = apiCircuitSchema.extend({ stops: z.array(apiCircuitStopSchema) })

export const apiCircuitPageSchema = page(apiCircuitSchema)

export const apiDepartureSchema = z.object({
  id: z.string(),
  circuit: z.object({ id: z.string(), title: z.string(), kind: z.string(), city }),
  guide: z.object({ id: z.string(), name: z.string(), photo: image.nullable() }),
  date: z.string(),
  start_time: z.string(),
  capacity: z.number(),
  booked: z.number(),
  remaining: z.number(),
  exclusive: z.boolean(),
  transport_included: z.boolean(),
  note: z.string(),
  cancelled: z.boolean(),
  price_adult: z.number(),
  price_child: z.number(),
})

/** Los campos del API que en el formulario se llaman distinto; `stops.3.point_id` cae en `stops`. */
export const CIRCUIT_FORM_FIELDS = {
  stops: 'stopIds',
  meetingLatitude: 'location',
  meetingLongitude: 'location',
  status: 'draft',
} as const

type ApiCircuit = z.infer<typeof apiCircuitSchema>
type ApiCircuitDetail = z.infer<typeof apiCircuitDetailSchema>

const categoryOf = (code: string) => CIRCUIT_CATEGORIES.find((category) => CIRCUIT_CATEGORY_CODES[category] === code) ?? 'Ciudad'
const difficultyOf = (code: string) => CIRCUIT_DIFFICULTIES.find((difficulty) => CIRCUIT_DIFFICULTY_CODES[difficulty] === code) ?? 'Fácil'

/** `"08:30"` → `"8:30 a.m."`. */
const toClock = (value: string) => inputToClock(value.slice(0, 5)) ?? value

export function toCircuit(api: ApiCircuit | ApiCircuitDetail): Circuit {
  const stops = 'stops' in api ? [...api.stops].sort((a, b) => a.order - b.order) : null
  const legMinutes = Object.fromEntries((stops ?? []).flatMap((stop) => (stop.leg_minutes === null ? [] : [[stop.point.id, stop.leg_minutes]])))
  const directions = Object.fromEntries((stops ?? []).flatMap((stop) => (stop.directions ? [[stop.point.id, stop.directions]] : [])))
  return {
    id: api.id,
    kind: api.kind,
    status: api.status,
    title: api.title,
    shortTitle: api.short_title,
    subtitle: api.subtitle,
    category: categoryOf(api.category),
    city: api.city.name,
    cityId: api.city.id,
    cityCode: api.city.code,
    organizer: api.municipality,
    rating: api.rating,
    reviewsCount: api.reviews_count,
    stopIds: stops ? stops.map((stop) => stop.point.id) : api.stop_ids,
    ...(stops ? { stops: stops.map((stop) => toStop(stop.point)) } : {}),
    travelMode: api.travel_mode,
    ...(Object.keys(legMinutes).length > 0 ? { legMinutes } : {}),
    ...(Object.keys(directions).length > 0 ? { directions } : {}),
    duration: formatDuration(api.duration_minutes),
    durationShort: durationShortText(api.duration_minutes),
    // El API suma las extra; el portal las muestra aparte.
    badges: Math.max(0, api.badges - api.bonus_badges),
    bonusBadges: api.bonus_badges,
    bookingMode: api.booking_mode,
    difficulty: difficultyOf(api.difficulty),
    priceAdult: api.price_adult,
    priceChild: api.price_child,
    description: api.description,
    images: api.images,
    recommendations: api.recommendations,
    meetingPoint: api.meeting_point,
    location: { latitude: api.meeting_latitude, longitude: api.meeting_longitude },
    includes: api.includes,
    notes: api.notes,
    startTimes: api.start_times.map(toClock),
    ...(api.available_from && api.available_until ? { availableFrom: api.available_from, availableUntil: api.available_until } : {}),
    version: api.version,
  }
}

export function toCircuitPage(api: z.infer<typeof apiCircuitPageSchema>): Page<Circuit> {
  return {
    results: api.results.map(toCircuit),
    current: api.current,
    pages: api.pages,
    elements: api.elements,
    hasNext: api.next,
    hasPrevious: api.previous,
  }
}

/**
 * El circuito completo, como lo reemplaza el API. Cada tipo fija lo suyo (el creativo es en grupo y
 * da tres insignias; el privado, privado y sin extras): se manda ya resuelto. Sin ciudad, el API lo
 * crea en la de la alcaldía que lo pide.
 */
export function circuitBody(input: CircuitInput) {
  const kplan = input.kind === 'kplan'
  return {
    kind: input.kind,
    ...(input.cityId ? { city_id: input.cityId } : {}),
    title: input.title.trim(),
    short_title: input.shortTitle.trim(),
    subtitle: input.subtitle.trim(),
    description: input.description.trim(),
    category: CIRCUIT_CATEGORY_CODES[input.category],
    difficulty: CIRCUIT_DIFFICULTY_CODES[input.difficulty],
    travel_mode: input.travelMode,
    price_adult: input.priceAdult,
    price_child: input.priceChild,
    recommendations: input.recommendations.trim(),
    includes: input.includes.trim(),
    notes: input.notes.trim(),
    meeting_point: input.meetingPoint.trim(),
    meeting_latitude: input.location.latitude,
    meeting_longitude: input.location.longitude,
    start_times: input.startTimes.map((time) => clockToInput(time)).filter((time) => time !== ''),
    bonus_badges: kplan ? input.bonusBadges : input.kind === 'creative' ? CREATIVE_BONUS_BADGES : 0,
    booking_mode: kplan ? input.bookingMode : input.kind === 'creative' ? 'group' : 'private',
    available_from: kplan && input.availableFrom && input.availableUntil ? input.availableFrom : null,
    available_until: kplan && input.availableFrom && input.availableUntil ? input.availableUntil : null,
    images: input.images.map((photo) => photo.key),
    stops: input.stopIds.map((stopId, index) => ({
      point_id: stopId,
      directions: input.directions?.[stopId] ?? '',
      // La primera parada no tiene traslado desde una anterior.
      leg_minutes: index > 0 ? (input.legMinutes?.[stopId] ?? null) : null,
    })),
    status: input.draft ? 'draft' : 'published',
  }
}

export function toDeparture(api: z.infer<typeof apiDepartureSchema>): Departure {
  return {
    id: api.id,
    circuitId: api.circuit.id,
    date: api.date,
    startTime: toClock(api.start_time),
    capacity: api.capacity,
    booked: api.booked,
    remaining: api.remaining,
    exclusive: api.exclusive,
    guideName: api.guide.name,
    transportIncluded: api.transport_included,
    note: api.note,
    cancelled: api.cancelled,
  }
}
