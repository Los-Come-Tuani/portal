/**
 * Eventos de visita de prueba (CONTEXTO_KPLAN.md, sección 9.4): reservas con
 * semilla fija por fecha, su itinerario con el planificador de la app, y
 * check-ins o abandonos en las pasadas. Cada fecha sale siempre igual.
 */
import { addDays, toLocalDateTime, weekdayIndex, type ISODate } from '@/lib/dates'
import { planItinerary, type ItineraryPace, type TravelMode } from '@/lib/itinerary'
import { createRandom, hashSeed, type Random } from '@/lib/random'
import { parseClock } from '@/lib/time'
import { USER_CIRCUIT_PREFIX, type Circuit, type DropReason, type VisitEvent } from '../../models'
import { catalog, catalogStop } from '../catalog'
import type { MockStop as Stop } from '../db'

export const VISIT_WINDOW = { pastDays: 60, futureDays: 14 } as const

interface Booking {
  id: string
  circuitId: string
  stops: Stop[]
  mode: TravelMode
  pace: ItineraryPace
  legMinutes: Record<string, number>
  start: number
  groupSize: number
  recordedAt: string
  userBuilt: boolean
}

const GROUP_SIZES: [number, number][] = [
  [1, 10],
  [2, 30],
  [3, 20],
  [4, 20],
  [5, 8],
  [6, 6],
  [7, 3],
  [8, 3],
]

const DROP_REASONS: [DropReason, number][] = [
  ['no_time', 30],
  ['too_far', 20],
  ['closed', 15],
  ['weather', 10],
  ['not_interested', 10],
  ['too_expensive', 5],
  ['other', 10],
]

/** Caso visible para la demo: la tabacalera cierra temprano y la dejan por eso. */
const CLOSED_HEAVY: [DropReason, number][] = [
  ['closed', 45],
  ['no_time', 20],
  ['too_far', 10],
  ['weather', 8],
  ['not_interested', 7],
  ['too_expensive', 5],
  ['other', 5],
]
const CLOSED_HEAVY_STOPS = new Set(['esteli-tabacalera'])

/** El asistente de la app propone almorzar en una parada de Gastronomía. */
const LUNCH_STOPS: Record<string, string> = { Granada: 'granada-cocina-dona-tere' }
const VEHICLE_CITIES = new Set(['Masaya', 'Estelí', 'Matagalpa', 'Rivas'])
const USER_START_TIMES = [450, 480, 510, 540, 570, 600, 780]

const privateCircuits = catalog.circuits.filter((circuit) => !circuit.isCreativeCircuit)
const creativeCircuits = catalog.circuits.filter((circuit) => circuit.isCreativeCircuit)
const lunchStopIds = new Set(Object.values(LUNCH_STOPS))
const stopsByCity = new Map<string, Stop[]>()
for (const stop of catalog.stops) {
  if (lunchStopIds.has(stop.id)) continue
  stopsByCity.set(stop.city, [...(stopsByCity.get(stop.city) ?? []), stop])
}
const ownedStopIds = [...new Set(catalog.organizations.flatMap((organization) => organization.stopIds))]

let cache: { key: string; events: VisitEvent[] } | null = null

/** Todos los eventos de la ventana (60 días atrás, 14 adelante) relativa a hoy. */
export function getVisitEvents(today: ISODate, now: number): VisitEvent[] {
  const key = `${today}:${Math.floor(now / 5)}`
  if (cache?.key === key) return cache.events
  const events: VisitEvent[] = []
  for (let offset = -VISIT_WINDOW.pastDays; offset <= VISIT_WINDOW.futureDays; offset++) {
    events.push(...eventsForDay(addDays(today, offset), offset, now))
  }
  cache = { key, events }
  return events
}

function eventsForDay(date: ISODate, offset: number, now: number): VisitEvent[] {
  const random = createRandom(hashSeed(`kplan-visits:${date}`))
  const weekend = weekdayIndex(date) >= 5
  const bookings: Booking[] = []
  let serial = 0
  const nextId = () => `booking-${date.replaceAll('-', '')}-${++serial}`
  const recordedAt = () => toLocalDateTime(addDays(date, -random.int(1, 12)), random.int(7 * 60, 22 * 60))

  const fromCircuit = (circuit: Circuit, start: number, groupSize: number): Booking => ({
    id: nextId(),
    circuitId: circuit.id,
    stops: circuit.stopIds.map(catalogStop),
    mode: circuit.travelMode,
    pace: 'balanced',
    legMinutes: circuit.legMinutes ?? {},
    start,
    groupSize,
    recordedAt: recordedAt(),
    userBuilt: false,
  })

  for (const circuit of privateCircuits) {
    const count = random.int(0, weekend ? 4 : 2)
    for (let index = 0; index < count; index++) {
      bookings.push(fromCircuit(circuit, parseClock(random.pick(circuit.startTimes)) ?? 480, groupSize(random)))
    }
  }

  for (const circuit of creativeCircuits) {
    const sessions =
      offset >= 0
        ? catalog.groupSessions
            .filter((session) => session.circuitId === circuit.id && session.daysFromNow === offset)
            .map((session) => ({ startTime: session.startTime, joined: session.joinedCount }))
        : Array.from({ length: random.int(0, weekend ? 2 : 1) }, () => ({
            startTime: random.pick(circuit.startTimes),
            joined: random.int(3, 12),
          }))
    for (const session of sessions) {
      let remaining = session.joined
      while (remaining > 0) {
        const size = Math.min(remaining, random.int(1, 4))
        remaining -= size
        bookings.push(fromCircuit(circuit, parseClock(session.startTime) ?? 540, size))
      }
    }
  }

  for (const [city, pool] of stopsByCity) {
    const [min, max] = city === 'Granada' ? [2, weekend ? 8 : 5] : [0, weekend ? 4 : 2]
    const count = random.int(min, max)
    for (let index = 0; index < count; index++) {
      const booking = userBuilt(city, pool, random, nextId(), recordedAt())
      if (booking) bookings.push(booking)
    }
  }

  const events: VisitEvent[] = []
  for (const booking of bookings) events.push(...bookingEvents(booking, date, offset, now, random))
  events.push(...looseCheckIns(date, offset, now, random))
  return events
}

function userBuilt(city: string, pool: Stop[], random: Random, id: string, recordedAt: string): Booking | null {
  if (pool.length < 2) return null
  const chosen = pickDistinct(pool, random.int(2, Math.min(4, pool.length)), random)
  const mode: TravelMode = VEHICLE_CITIES.has(city) ? 'vehicle' : 'walking'
  const pace = random.weighted<ItineraryPace>([
    ['balanced', 6],
    ['relaxed', 3],
    ['intense', 1],
  ])
  let start = random.pick(USER_START_TIMES)
  let stops = nearestNeighbor(chosen)

  // El almuerzo cae entre 11:45 a.m. y 1:15 p.m.: la salida se calcula hacia atrás.
  const lunchId = LUNCH_STOPS[city]
  const lunchTarget = random.int(47, 53) * 15
  const lunchAfter = random.int(1, Math.min(2, stops.length))
  if (lunchId && random.chance(0.7)) {
    stops = [...stops.slice(0, lunchAfter), catalogStop(lunchId), ...stops.slice(lunchAfter)]
    const draft = planItinerary({ stops, start: 0, mode, pace })
    start = Math.max(7 * 60, lunchTarget - draft.stops[lunchAfter].arrival)
  }

  return {
    id,
    circuitId: `${USER_CIRCUIT_PREFIX}${hashSeed(id).toString(36)}`,
    stops,
    mode,
    pace,
    legMinutes: {},
    start,
    groupSize: groupSize(random),
    recordedAt,
    userBuilt: true,
  }
}

function bookingEvents(booking: Booking, date: ISODate, offset: number, now: number, random: Random): VisitEvent[] {
  const events: VisitEvent[] = []
  let stops = booking.stops

  const planningDrop = random.next()
  const droppedIndex = random.int(0, stops.length - 1)
  const planningReason = dropReason(stops[droppedIndex].id, random)
  if (booking.userBuilt && stops.length > 2 && planningDrop < 0.15) {
    const dropped = stops[droppedIndex]
    stops = stops.filter((stop) => stop !== dropped)
    events.push({
      type: 'stop_dropped',
      stopId: dropped.id,
      circuitId: booking.circuitId,
      reason: planningReason,
      stage: 'planning',
      recordedAt: booking.recordedAt,
    })
  }

  const itinerary = planItinerary({
    stops,
    start: booking.start,
    mode: booking.mode,
    pace: booking.pace,
    legMinutes: booking.legMinutes,
  })
  const noShow = random.chance(0.06)

  for (const planned of itinerary.stops) {
    const stopId = planned.stop.id
    events.push({
      type: 'planned_visit',
      stopId,
      circuitId: booking.circuitId,
      bookingId: booking.id,
      arrival: toLocalDateTime(date, planned.arrival),
      departure: toLocalDateTime(date, planned.departure),
      groupSize: booking.groupSize,
      recordedAt: booking.recordedAt,
    })

    // Se sortea todo aunque no se use, para que el día no cambie con la hora.
    const delay = random.int(0, 30)
    const checkInRoll = random.next()
    const dropRoll = random.next()
    const stage = random.chance(0.6) ? 'trip' : 'trip_ended'
    const reason = dropReason(stopId, random)

    const isPast = offset < 0 || (offset === 0 && planned.arrival <= now)
    if (!isPast) continue

    if (!noShow && checkInRoll < 0.8) {
      const scannedAt = planned.arrival + delay
      if (offset === 0 && scannedAt > now) continue
      events.push({
        type: 'check_in',
        stopId,
        circuitId: booking.circuitId,
        groupSize: booking.groupSize,
        recordedAt: toLocalDateTime(date, scannedAt),
      })
    } else if (dropRoll < 0.5) {
      const at = stage === 'trip' ? planned.arrival : itinerary.end
      if (offset === 0 && at > now) continue
      events.push({
        type: 'stop_dropped',
        stopId,
        circuitId: booking.circuitId,
        reason,
        stage,
        recordedAt: toLocalDateTime(date, at),
      })
    }
  }
  return events
}

/** Escaneos sin viaje en curso en los lugares con dueño. */
function looseCheckIns(date: ISODate, offset: number, now: number, random: Random): VisitEvent[] {
  const events: VisitEvent[] = []
  for (const stopId of ownedStopIds) {
    const count = random.int(0, 2)
    for (let index = 0; index < count; index++) {
      const at = random.int(9 * 60, 17 * 60)
      if (offset > 0 || (offset === 0 && at > now)) continue
      events.push({ type: 'check_in', stopId, circuitId: null, groupSize: null, recordedAt: toLocalDateTime(date, at) })
    }
  }
  return events
}

function groupSize(random: Random): number {
  return random.weighted(GROUP_SIZES)
}

function dropReason(stopId: string, random: Random): DropReason {
  return random.weighted(CLOSED_HEAVY_STOPS.has(stopId) ? CLOSED_HEAVY : DROP_REASONS)
}

function pickDistinct(pool: Stop[], count: number, random: Random): Stop[] {
  const remaining = [...pool]
  const chosen: Stop[] = []
  while (chosen.length < count && remaining.length > 0) {
    const pick = random.weighted(remaining.map((stop) => [stop, stop.rating + (stop.hasBadge ? 1 : 0)] as const))
    chosen.push(pick)
    remaining.splice(remaining.indexOf(pick), 1)
  }
  return chosen
}

/** Ordena las paradas por cercanía, empezando por la primera. */
function nearestNeighbor(stops: Stop[]): Stop[] {
  const [first, ...rest] = stops
  const ordered = [first]
  while (rest.length > 0) {
    const last = ordered[ordered.length - 1]
    let bestIndex = 0
    rest.forEach((stop, index) => {
      if (squaredDistance(last, stop) < squaredDistance(last, rest[bestIndex])) bestIndex = index
    })
    ordered.push(rest.splice(bestIndex, 1)[0])
  }
  return ordered
}

function squaredDistance(a: Stop, b: Stop): number {
  return (a.coordinates.latitude - b.coordinates.latitude) ** 2 + (a.coordinates.longitude - b.coordinates.longitude) ** 2
}
