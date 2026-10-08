import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { inputToClock } from '@/lib/time'
import { endpoints } from '../../api/endpoints'
import { CIRCUIT_CATEGORIES, CIRCUIT_CATEGORY_CODES, CIRCUIT_DIFFICULTIES, CIRCUIT_DIFFICULTY_CODES, CREATIVE_BONUS_BADGES } from '../../models'
import type { MockCircuit, MockDatabase } from '../db'
import { fail, paginate, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'
import { CITIES } from '../services/application-catalog'
import {
  actorMunicipality,
  checkCircuitStops,
  editableCircuit,
  visibleCircuit,
  visibleCircuits,
  wireCircuit,
  wireCircuitDetail,
  wireDepartures,
} from '../services/circuits'
import { checkPhotos, wireCity } from '../services/places'

const clock = z.string().regex(/^\d{2}:\d{2}$/, { error: 'Usa el formato HH:MM.' })
const text = (max: number) => z.string().trim().max(max).default('')

/** El cuerpo de `POST` y `PUT official-circuit/`, con los límites del API. */
const circuitBody = z.object({
  kind: z.enum(['kplan', 'creative', 'private']).default('creative'),
  city_id: z.string().nullish(),
  title: z.string().trim().min(8).max(80),
  short_title: z.string().trim().min(3).max(28),
  subtitle: z.string().trim().min(3).max(60),
  description: z.string().trim().min(60).max(2000),
  category: z.enum(['city', 'nature', 'culture']),
  difficulty: z.enum(['easy', 'moderate']),
  travel_mode: z.enum(['walking', 'vehicle']).default('walking'),
  price_adult: z.number().int().min(0).max(20_000).default(0),
  price_child: z.number().int().min(0).max(20_000).default(0),
  recommendations: text(1000),
  includes: text(1000),
  notes: text(1000),
  meeting_point: z.string().trim().min(3).max(200),
  meeting_latitude: z.number().min(10.7).max(15.1),
  meeting_longitude: z.number().min(-87.7).max(-82.6),
  start_times: z.array(clock).max(6).default([]),
  bonus_badges: z.number().int().min(0).max(5).default(0),
  booking_mode: z.enum(['private', 'group']).default('private'),
  available_from: z.string().nullable().default(null),
  available_until: z.string().nullable().default(null),
  images: z.array(z.string().min(1)).max(8).default([]),
  stops: z
    .array(
      z.object({
        point_id: z.string().min(1),
        directions: text(500),
        leg_minutes: z.number().int().min(0).max(600).nullable().default(null),
      }),
    )
    .min(2)
    .max(10),
  status: z.enum(['draft', 'published', 'unpublished']).default('draft'),
})

type CircuitBody = z.infer<typeof circuitBody>

const invalid = (field: string, message: string) => fail.invalid('Revisa los campos marcados', { [field]: message })
const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const byCityAndTitle = (a: MockCircuit, b: MockCircuit) => a.city.localeCompare(b.city, 'es') || a.title.localeCompare(b.title, 'es')

/** El nombre de la ciudad de un `city_id`: las del catálogo y las que ya tienen lugares en la demo. */
function cityName(db: MockDatabase, cityId: string): string | null {
  const known = CITIES.find((city) => city.id === cityId)
  if (known) return known.name
  return db.stops.map((stop) => stop.city).find((name) => wireCity(name).id === cityId) ?? null
}

/** De quién es y dónde: el equipo elige tipo y ciudad; la alcaldía sólo hace creativos de la suya. */
function placement(db: MockDatabase, context: MockContext, input: CircuitBody) {
  const user = requireUser(context)
  if (hasPermission(db, user, ['circuits.manage'])) {
    if (!input.city_id) throw invalid('city_id', 'Elige la ciudad del circuito.')
    const city = cityName(db, input.city_id)
    if (!city) throw invalid('city_id', 'Esa ciudad no existe.')
    if (input.kind !== 'creative') return { kind: input.kind, city, organizerId: null }
    const organizer = db.organizations.find((item) => item.type === 'alcaldia' && item.status === 'active' && item.city === city)
    if (!organizer) throw invalid('kind', 'Un circuito creativo es de la alcaldía, y esa ciudad no tiene una verificada.')
    return { kind: input.kind, city, organizerId: organizer.id }
  }
  const municipality = actorMunicipality(db, user)
  if (!municipality) throw fail.forbidden()
  if (input.city_id && input.city_id !== wireCity(municipality.city).id) throw invalid('city_id', 'Solo puedes publicar circuitos de tu ciudad.')
  return { kind: 'creative' as const, city: municipality.city, organizerId: municipality.id }
}

/** Lo que fija cada tipo: el creativo es en grupo y da tres insignias; el privado, nada extra. */
function kindRules(kind: MockCircuit['kind'], input: CircuitBody) {
  if (kind === 'creative') return { bonusBadges: CREATIVE_BONUS_BADGES, bookingMode: 'group' as const, availableFrom: null, availableUntil: null }
  if (kind === 'private') return { bonusBadges: 0, bookingMode: 'private' as const, availableFrom: null, availableUntil: null }
  if (input.bonus_badges < 1) throw invalid('bonus_badges', "Un especial de K'Plan da al menos una insignia.")
  if ((input.available_from === null) !== (input.available_until === null)) throw invalid('available_until', 'La temporada lleva las dos fechas o ninguna.')
  if (input.available_from && input.available_until && input.available_until < input.available_from) {
    throw invalid('available_until', 'La temporada termina antes de empezar.')
  }
  return { bonusBadges: input.bonus_badges, bookingMode: input.booking_mode, availableFrom: input.available_from, availableUntil: input.available_until }
}

/** Los campos que se escriben tal cual, en el formato de la app. */
function fieldsOf(db: MockDatabase, input: CircuitBody, city: string, currentImages: readonly string[]) {
  checkCircuitStops(
    db,
    input.stops.map((stop) => stop.point_id),
    city,
  )
  if (new Set(input.start_times).size !== input.start_times.length) throw invalid('start_times', 'Hay un horario repetido.')
  const images = checkPhotos(db, input.images, currentImages, 'images')
  if (input.status === 'published' && images.length === 0) throw invalid('images', 'Para publicarlo hace falta al menos una foto.')
  if (input.status === 'published' && input.start_times.length === 0) throw invalid('start_times', 'Para publicarlo hace falta al menos un horario.')
  const legMinutes = Object.fromEntries(input.stops.flatMap((stop, index) => (index > 0 && stop.leg_minutes !== null ? [[stop.point_id, stop.leg_minutes]] : [])))
  const directions = Object.fromEntries(input.stops.flatMap((stop) => (stop.directions ? [[stop.point_id, stop.directions]] : [])))
  return {
    title: input.title,
    shortTitle: input.short_title,
    subtitle: input.subtitle,
    description: input.description,
    category: CIRCUIT_CATEGORIES.find((item) => CIRCUIT_CATEGORY_CODES[item] === input.category) ?? 'Ciudad',
    difficulty: CIRCUIT_DIFFICULTIES.find((item) => CIRCUIT_DIFFICULTY_CODES[item] === input.difficulty) ?? 'Fácil',
    travelMode: input.travel_mode,
    priceAdult: input.price_adult,
    priceChild: input.price_child,
    recommendations: input.recommendations,
    includes: input.includes,
    notes: input.notes,
    meetingPoint: input.meeting_point,
    location: { latitude: input.meeting_latitude, longitude: input.meeting_longitude },
    startTimes: [...input.start_times].sort().map((time) => inputToClock(time) ?? time),
    images,
    stopIds: input.stops.map((stop) => stop.point_id),
    ...(Object.keys(legMinutes).length > 0 ? { legMinutes } : {}),
    ...(Object.keys(directions).length > 0 ? { directions } : {}),
  }
}

export const circuitRoutes = [
  // ── Lo que ve la app, sin sesión ──
  route(
    'GET',
    endpoints.publishedCircuits,
    ({ db, query }) => {
      const city = query.get('city')
      const kind = query.get('kind')
      return db.circuits
        .filter((circuit) => circuit.status === 'published')
        .filter((circuit) => !city || wireCity(circuit.city).code === city)
        .filter((circuit) => !kind || circuit.kind === kind)
        .sort(byCityAndTitle)
        .map((circuit) => wireCircuit(db, circuit))
    },
    { isPublic: true },
  ),
  route(
    'GET',
    endpoints.circuitDepartures(':id'),
    ({ db, params }) => {
      const circuit = db.circuits.find((item) => item.id === params.id)
      return circuit ? wireDepartures(db, circuit) : []
    },
    { isPublic: true },
  ),

  // ── El portal ──
  route('GET', endpoints.officialCircuit.list, (context) => {
    const { db, query } = context
    const cityId = query.get('city_id')
    const kind = query.get('kind')
    const status = query.get('status')
    const search = fold(query.get('search')?.trim() ?? '')
    const shown = visibleCircuits(db, requireUser(context))
      .filter((circuit) => (status ? circuit.status === status : circuit.status !== 'retired'))
      .filter((circuit) => !cityId || wireCity(circuit.city).id === cityId)
      .filter((circuit) => !kind || circuit.kind === kind)
      .filter((circuit) => !search || fold(`${circuit.title} ${circuit.shortTitle}`).includes(search))
      .sort(byCityAndTitle)
      .map((circuit) => wireCircuit(db, circuit))
    return paginate(shown, query)
  }),
  route('POST', endpoints.officialCircuit.list, (context) => {
    const { db, body } = context
    const input = parseBody(circuitBody, body)
    const { kind, city, organizerId } = placement(db, context, input)
    const rules = kindRules(kind, input)
    const fields = fieldsOf(db, input, city, [])
    const now = nowLocalDateTime()
    const published = input.status === 'published'
    const base = kind === 'kplan' ? `kplan-${input.short_title}` : input.title
    const circuit: MockCircuit = {
      id: uniqueSlug(base, (id) => db.circuits.some((item) => item.id === id)),
      kind,
      status: published ? 'published' : 'draft',
      city,
      organizerId,
      rating: 0,
      reviewsCount: 0,
      ...fields,
      ...rules,
      version: 1,
      createdAt: now,
      publishedAt: published ? now : null,
    }
    db.circuits.push(circuit)
    return wireCircuitDetail(db, circuit)
  }),
  route('GET', endpoints.officialCircuit.detail(':id'), (context) =>
    wireCircuitDetail(context.db, visibleCircuit(context.db, requireUser(context), context.params.id)),
  ),
  route('PUT', endpoints.officialCircuit.detail(':id'), (context) => {
    const { db, body, params } = context
    const circuit = editableCircuit(db, requireUser(context), params.id)
    const input = parseBody(circuitBody, body)
    const { kind, city, organizerId } = placement(db, context, input)
    const rules = kindRules(kind, input)
    const fields = fieldsOf(db, input, city, circuit.images)
    const wasPublished = circuit.publishedAt !== null
    // Sacar de la app uno que ya se publicó lo deja "despublicado"; lo que nunca salió sigue en borrador.
    const status = input.status === 'published' ? 'published' : wasPublished ? 'unpublished' : 'draft'
    const geometryChanged = circuit.stopIds.join(',') !== fields.stopIds.join(',')
    delete circuit.legMinutes
    delete circuit.directions
    Object.assign(circuit, fields, rules, {
      kind,
      city,
      organizerId,
      status,
      version: circuit.version + (geometryChanged ? 1 : 0),
      publishedAt: status === 'published' && !wasPublished ? nowLocalDateTime() : circuit.publishedAt,
    })
    return wireCircuitDetail(db, circuit)
  }),
  route('DELETE', endpoints.officialCircuit.detail(':id'), (context) => {
    const circuit = editableCircuit(context.db, requireUser(context), context.params.id)
    circuit.status = 'retired'
    return undefined
  }),
]
