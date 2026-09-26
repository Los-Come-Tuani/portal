/**
 * Planificador de itinerarios: el mismo cálculo que la app
 * (mobile/lib/src/core/utils/itinerary_planner.dart). Estima cada traslado
 * con la distancia en línea recta, alargada por el trazado de las calles.
 * Cualquier cambio aquí tiene que hacerse también en la app.
 */
import { formatDistance, formatDuration, formatTime } from './format'
import { parseClock, parseDuration } from './time'

export type TravelMode = 'walking' | 'vehicle'
export type ItineraryPace = 'relaxed' | 'balanced' | 'intense'

export const PACES: Record<
  ItineraryPace,
  { label: string; visitFactor: number; marginMinutes: number; maxDayMinutes: number }
> = {
  relaxed: { label: 'Relajado', visitFactor: 1.25, marginMinutes: 10, maxDayMinutes: 6 * 60 },
  balanced: { label: 'Equilibrado', visitFactor: 1, marginMinutes: 0, maxDayMinutes: 8 * 60 },
  intense: { label: 'Intenso', visitFactor: 0.85, marginMinutes: 0, maxDayMinutes: 10 * 60 },
}

const DETOUR_FACTOR = 1.3
const WALKING_KMH = 4.5
const VEHICLE_KMH = 30
const VEHICLE_OVERHEAD_MINUTES = 5
const SAME_PLACE_KM = 0.15
const WALKABLE_KM = 1
const LONG_WALK_KM = 2
const NIGHT_FROM_MINUTES = 18 * 60 + 30
const DEFAULT_VISIT_MINUTES = 30
const EARTH_RADIUS_KM = 6371

export interface PlannerStop {
  id: string
  name: string
  duration: string
  opensAt?: string
  closesAt?: string
  coordinates: { latitude: number; longitude: number }
}

export type LegKind = 'samePlace' | 'walking' | 'vehicle' | 'fixed'

export interface ItineraryLeg {
  kind: LegKind
  minutes: number
  /** Distancia estimada por calle, no en línea recta. */
  distanceKm: number
}

export interface ItineraryStop<S extends PlannerStop> {
  stop: S
  /** Minutos desde la medianoche. */
  arrival: number
  departure: number
  /** Traslado desde la parada anterior; `null` en la primera. */
  leg: ItineraryLeg | null
}

export type ItineraryWarningKind = 'longWalk' | 'closed' | 'endsLate'

export interface ItineraryWarning {
  kind: ItineraryWarningKind
  message: string
  stopId?: string
}

export interface Itinerary<S extends PlannerStop> {
  start: number
  end: number
  totalMinutes: number
  mode: TravelMode
  pace: ItineraryPace
  stops: ItineraryStop<S>[]
  warnings: ItineraryWarning[]
}

interface PlanOptions<S extends PlannerStop> {
  stops: readonly S[]
  /** Hora de salida en minutos desde la medianoche. */
  start: number
  mode?: TravelMode
  pace?: ItineraryPace
  /** Traslado fijo hacia una parada (por id), p. ej. el desembarco de un ferry. */
  legMinutes?: Readonly<Record<string, number>>
}

export function planItinerary<S extends PlannerStop>({
  stops,
  start,
  mode = 'walking',
  pace = 'balanced',
  legMinutes = {},
}: PlanOptions<S>): Itinerary<S> {
  const planned: ItineraryStop<S>[] = []
  const warnings: ItineraryWarning[] = []
  let clock = start

  stops.forEach((stop, index) => {
    let leg: ItineraryLeg | null = null
    if (index > 0) {
      const previous = stops[index - 1]
      leg = legBetween(previous, stop, mode, legMinutes[stop.id])
      clock += leg.minutes
      if (isLongWalk(leg)) {
        warnings.push({
          kind: 'longWalk',
          stopId: stop.id,
          message:
            `De ${previous.name} a ${stop.name} son ${formatDistance(leg.distanceKm)} a pie ` +
            `(${formatDuration(leg.minutes)}). Si prefieres, haz ese tramo en taxi o en vehículo.`,
        })
      }
    }

    const arrival = clock
    const departure = arrival + visitMinutes(stop, pace)
    planned.push({ stop, arrival, departure, leg })
    const closed = openingWarning(stop, arrival, departure)
    if (closed) warnings.push(closed)
    clock = departure
  })

  if (planned.length > 0 && clock > NIGHT_FROM_MINUTES) {
    warnings.push({ kind: 'endsLate', message: `Terminarías a las ${formatTime(clock)}, ya de noche.` })
  }

  return { start, end: clock, totalMinutes: clock - start, mode, pace, stops: planned, warnings }
}

/** El traslado de `from` a `to`. Con vehículo, los tramos cortos se siguen caminando. */
export function legBetween(
  from: PlannerStop,
  to: PlannerStop,
  mode: TravelMode,
  fixedMinutes?: number,
): ItineraryLeg {
  if (fixedMinutes !== undefined) {
    return { kind: 'fixed', minutes: fixedMinutes, distanceKm: distanceKm(from, to) * DETOUR_FACTOR }
  }
  return legForDistance(distanceKm(from, to), mode)
}

export function legForDistance(straightKm: number, mode: TravelMode): ItineraryLeg {
  const km = straightKm * DETOUR_FACTOR
  if (km < SAME_PLACE_KM) return { kind: 'samePlace', minutes: 0, distanceKm: km }
  if (mode === 'walking' || km <= WALKABLE_KM) {
    return { kind: 'walking', minutes: roundUp((km / WALKING_KMH) * 60), distanceKm: km }
  }
  return {
    kind: 'vehicle',
    minutes: roundUp((km / VEHICLE_KMH) * 60 + VEHICLE_OVERHEAD_MINUTES),
    distanceKm: km,
  }
}

/** Minutos en la parada según el ritmo, en múltiplos de 5. */
export function visitMinutes(stop: Pick<PlannerStop, 'duration'>, pace: ItineraryPace): number {
  const suggested = parseDuration(stop.duration)
  const base = suggested === 0 ? DEFAULT_VISIT_MINUTES : suggested
  const scaled = Math.round((base * PACES[pace].visitFactor) / 5) * 5
  return Math.max(5, scaled) + PACES[pace].marginMinutes
}

/** Distancia en línea recta (fórmula del haversine), en km. */
export function distanceKm(a: PlannerStop, b: PlannerStop): number {
  const dLat = radians(b.coordinates.latitude - a.coordinates.latitude)
  const dLon = radians(b.coordinates.longitude - a.coordinates.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.coordinates.latitude)) *
      Math.cos(radians(b.coordinates.latitude)) *
      Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function isLongWalk(leg: ItineraryLeg): boolean {
  return leg.kind === 'walking' && leg.distanceKm > LONG_WALK_KM
}

/** `A pasos`, `10 min a pie`, `25 min en vehículo`, `Sin traslado`. */
export function legLabel(leg: ItineraryLeg): string {
  switch (leg.kind) {
    case 'samePlace':
      return 'A pasos'
    case 'walking':
      return `${formatDuration(leg.minutes)} a pie`
    case 'vehicle':
      return `${formatDuration(leg.minutes)} en vehículo`
    case 'fixed':
      return leg.minutes === 0 ? 'Sin traslado' : `${formatDuration(leg.minutes)} de traslado`
  }
}

function openingWarning(stop: PlannerStop, arrives: number, leaves: number): ItineraryWarning | null {
  const opens = stop.opensAt ? parseClock(stop.opensAt) : null
  const closes = stop.closesAt ? parseClock(stop.closesAt) : null
  if (opens === null || closes === null) return null

  let message: string
  if (arrives >= closes) {
    message = `Llegarías a ${stop.name} a las ${formatTime(arrives)}, cuando ya cerró (cierra a las ${formatTime(closes)}).`
  } else if (leaves > closes) {
    message = `${stop.name} cierra a las ${formatTime(closes)} y saldrías a las ${formatTime(leaves)}`
  } else if (arrives < opens) {
    message = `Llegarías a ${stop.name} a las ${formatTime(arrives)} y abre a las ${formatTime(opens)}`
  } else {
    return null
  }
  return { kind: 'closed', stopId: stop.id, message }
}

function roundUp(minutes: number): number {
  return Math.max(5, Math.ceil(minutes / 5) * 5)
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
