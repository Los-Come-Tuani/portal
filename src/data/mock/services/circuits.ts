/**
 * Los circuitos oficiales en el backend de demo con el formato y las reglas del API
 * (docs/territorio.md del repo del API): quién ve y quién edita cada circuito, y cómo se escribe uno
 * en `snake_case`.
 */
import { addDays, todayISO } from '@/lib/dates'
import { clockToInput, parseDuration } from '@/lib/time'
import { CIRCUIT_CATEGORY_CODES, CIRCUIT_DIFFICULTY_CODES, type Organization, type User } from '../../models'
import { catalog } from '../catalog'
import type { MockCircuit, MockDatabase } from '../db'
import { fail } from '../http'
import { hasPermission } from './access'
import { actorOrganization, isActive, wireCity, wireInstant, wirePhoto, wireStop } from './places'

const NOT_FOUND = 'No encontramos ese circuito.'

/** La alcaldía verificada de quien entró; el equipo y los comercios no tienen. */
export function actorMunicipality(db: MockDatabase, user: User): Organization | null {
  const organization = actorOrganization(db, user)
  return organization?.type === 'alcaldia' ? organization : null
}

/** El equipo con `circuits.view` ve todos; la alcaldía, los de su ciudad. Los retirados también. */
export function visibleCircuits(db: MockDatabase, user: User): MockCircuit[] {
  if (hasPermission(db, user, ['circuits.view'])) return db.circuits
  const municipality = actorMunicipality(db, user)
  if (!municipality) throw fail.forbidden()
  return db.circuits.filter((circuit) => circuit.city === municipality.city)
}

/** Un circuito de otra ciudad no existe para la alcaldía, ni por identificador. */
export function visibleCircuit(db: MockDatabase, user: User, circuitId: string): MockCircuit {
  const circuit = visibleCircuits(db, user).find((item) => item.id === circuitId)
  if (!circuit) throw fail.notFound(NOT_FOUND)
  return circuit
}

/** Edita el equipo con `circuits.manage`; la alcaldía, los que organiza ella. Uno retirado, nadie. */
export function editableCircuit(db: MockDatabase, user: User, circuitId: string): MockCircuit {
  const circuit = visibleCircuit(db, user, circuitId)
  if (!hasPermission(db, user, ['circuits.manage'])) {
    const municipality = actorMunicipality(db, user)
    if (!municipality || circuit.organizerId !== municipality.id) throw fail.forbidden()
  }
  if (circuit.status === 'retired') throw fail.conflict('Un circuito retirado ya no se edita.')
  return circuit
}

function stopsOf(db: MockDatabase, circuit: MockCircuit) {
  return circuit.stopIds.flatMap((stopId) => db.stops.filter((stop) => stop.id === stopId))
}

/** Como `inline_payload` del API: sin las paradas, con `stop_ids`, la duración y las insignias. */
export function wireCircuit(db: MockDatabase, circuit: MockCircuit) {
  const stops = stopsOf(db, circuit)
  const organizer = db.organizations.find((item) => item.id === circuit.organizerId)
  return {
    id: circuit.id,
    kind: circuit.kind,
    status: circuit.status,
    city: wireCity(circuit.city),
    municipality: organizer ? { id: organizer.id, name: organizer.name } : null,
    title: circuit.title,
    short_title: circuit.shortTitle,
    subtitle: circuit.subtitle,
    description: circuit.description,
    category: CIRCUIT_CATEGORY_CODES[circuit.category],
    difficulty: CIRCUIT_DIFFICULTY_CODES[circuit.difficulty],
    travel_mode: circuit.travelMode,
    price_adult: circuit.priceAdult,
    price_child: circuit.priceChild,
    recommendations: circuit.recommendations,
    includes: circuit.includes,
    notes: circuit.notes,
    meeting_point: circuit.meetingPoint,
    meeting_latitude: circuit.location.latitude,
    meeting_longitude: circuit.location.longitude,
    start_times: circuit.startTimes.map((time) => clockToInput(time)).filter((time) => time !== ''),
    bonus_badges: circuit.bonusBadges,
    booking_mode: circuit.bookingMode,
    available_from: circuit.availableFrom,
    available_until: circuit.availableUntil,
    version: circuit.version,
    rating: circuit.rating,
    reviews_count: circuit.reviewsCount,
    images: circuit.images.map((key) => wirePhoto(db, key)),
    stop_ids: circuit.stopIds,
    badges: stops.filter((stop) => stop.hasBadge).length + circuit.bonusBadges,
    duration_minutes: stops.reduce((sum, stop) => sum + (parseDuration(stop.duration) || 30) + (circuit.legMinutes?.[stop.id] ?? 0), 0),
    created_at: wireInstant(circuit.createdAt),
    published_at: circuit.publishedAt ? wireInstant(circuit.publishedAt) : null,
  }
}

/** Con sus paradas: cada una con el lugar completo, también si ya se retiró. */
export function wireCircuitDetail(db: MockDatabase, circuit: MockCircuit) {
  return {
    ...wireCircuit(db, circuit),
    stops: stopsOf(db, circuit).map((stop, order) => ({
      order,
      point: wireStop(db, stop),
      directions: circuit.directions?.[stop.id] ?? '',
      leg_minutes: order > 0 ? (circuit.legMinutes?.[stop.id] ?? null) : null,
    })),
  }
}

/**
 * Las próximas salidas de un circuito publicado, como `DepartureGet` del API. En la demo salen de
 * los horarios de grupo de la app: el guía es uno de sus perfiles.
 */
export function wireDepartures(db: MockDatabase, circuit: MockCircuit) {
  if (circuit.status !== 'published') return []
  const today = todayISO()
  return db.groupSessions
    .filter((session) => session.circuitId === circuit.id && session.daysFromNow >= 0)
    .map((session) => {
      const guide = catalog.appGuides.find((item) => item.id === session.guideId)
      const exclusive = circuit.bookingMode === 'private'
      return {
        id: session.id,
        circuit: { id: circuit.id, title: circuit.title, kind: circuit.kind, city: wireCity(circuit.city) },
        guide: { id: session.guideId, name: guide?.name ?? 'Guía certificado', photo: guide ? { key: guide.photoUrl, url: guide.photoUrl } : null },
        date: addDays(today, session.daysFromNow),
        start_time: clockToInput(session.startTime),
        capacity: session.capacity,
        booked: session.joinedCount,
        remaining: exclusive && session.joinedCount > 0 ? 0 : Math.max(0, session.capacity - session.joinedCount),
        exclusive,
        transport_included: session.transportIncluded,
        note: session.note,
        cancelled: false,
        price_adult: circuit.priceAdult,
        price_child: circuit.priceChild,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
}

/** Las paradas tienen que ser lugares activos de la ciudad del circuito, sin repetir. */
export function checkCircuitStops(db: MockDatabase, stopIds: readonly string[], city: string): void {
  if (new Set(stopIds).size !== stopIds.length) {
    throw fail.invalid('Revisa los campos marcados', { stops: 'Un lugar no se visita dos veces en el mismo recorrido.' })
  }
  stopIds.forEach((stopId, index) => {
    const stop = db.stops.find((item) => item.id === stopId)
    if (!stop || !isActive(stop)) throw fail.invalid('Revisa los campos marcados', { [`stops.${index}.point_id`]: 'Ese lugar no existe o se retiró.' })
    if (stop.city !== city) throw fail.invalid('Revisa los campos marcados', { [`stops.${index}.point_id`]: 'Ese lugar es de otra ciudad.' })
  })
}
