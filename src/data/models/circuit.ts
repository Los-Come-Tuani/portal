import type { ClockTime, ISODate, LatLng } from './common'
import type { TravelMode } from '@/lib/itinerary'

export interface CircuitComment {
  author: string
  rating: number
  timeAgo: string
  text: string
}

/** Cómo se hace: cada grupo agenda el suyo, o se inscribe en un horario de grupo con guía. */
export type BookingMode = 'private' | 'group'

/**
 * circuits.json de la app. `isKplanCircuit`, `bonusBadges`, `bookingMode` y la
 * temporada son nuevos: la app los ignora hasta que se actualice para leerlos.
 */
export interface Circuit {
  id: string
  title: string
  shortTitle: string
  subtitle: string
  category: string
  city: string
  rating: number
  reviewsCount: number
  stopIds: string[]
  travelMode: TravelMode
  legMinutes?: Record<string, number>
  duration: string
  durationShort: string
  badges: number
  difficulty: string
  priceAdult: number
  priceChild: number
  description: string
  images: string[]
  recommendations: string
  meetingPoint: string
  location: LatLng
  includes: string
  badgesNote: string
  notes: string
  startTimes: ClockTime[]
  comments: CircuitComment[]
  isCreativeCircuit?: boolean
  organizer?: string
  /** Especial de K'Plan: al completarlo da `bonusBadges` insignias de "Circuitos K'Plan". */
  isKplanCircuit?: boolean
  bonusBadges?: number
  /** Sólo en los especiales; los creativos siempre son en grupo y los demás, privados. */
  bookingMode?: BookingMode
  /** De temporada: la app lo muestra sólo entre estas fechas (van las dos o ninguna). */
  availableFrom?: ISODate
  availableUntil?: ISODate
  /** Sólo en el portal: un borrador no se le manda a la app. */
  draft?: boolean
}

export type CircuitKind = 'kplan' | 'creative' | 'private'

export const CIRCUIT_KIND_LABELS: Record<CircuitKind, string> = {
  kplan: "Especial de K'Plan",
  creative: 'Creativo',
  private: 'Privado',
}

/** Las de los datos más Cultura, que la app ya pinta con su propio color. */
export const CIRCUIT_CATEGORIES = ['Ciudad', 'Naturaleza', 'Cultura'] as const
export const CIRCUIT_DIFFICULTIES = ['Fácil', 'Moderado'] as const

export const KPLAN_BADGE_CATEGORY = "Circuitos K'Plan"
export const CREATIVE_BONUS_BADGES = 3
export const MAX_BONUS_BADGES = 5

export function circuitKind(circuit: Pick<Circuit, 'isKplanCircuit' | 'isCreativeCircuit'>): CircuitKind {
  if (circuit.isKplanCircuit) return 'kplan'
  if (circuit.isCreativeCircuit) return 'creative'
  return 'private'
}

export function bookingModeOf(circuit: Pick<Circuit, 'isKplanCircuit' | 'isCreativeCircuit' | 'bookingMode'>): BookingMode {
  const kind = circuitKind(circuit)
  if (kind === 'creative') return 'group'
  if (kind === 'kplan') return circuit.bookingMode ?? 'private'
  return 'private'
}

/** Insignias extra al completarlo, además de las de sus paradas. */
export function bonusBadgesOf(circuit: Pick<Circuit, 'isKplanCircuit' | 'isCreativeCircuit' | 'bonusBadges'>): number {
  const kind = circuitKind(circuit)
  if (kind === 'creative') return CREATIVE_BONUS_BADGES
  if (kind === 'kplan') return circuit.bonusBadges ?? 0
  return 0
}

export type SeasonState = 'always' | 'upcoming' | 'active' | 'ended'

export function seasonState(circuit: Pick<Circuit, 'availableFrom' | 'availableUntil'>, today: ISODate): SeasonState {
  if (!circuit.availableFrom || !circuit.availableUntil) return 'always'
  if (today < circuit.availableFrom) return 'upcoming'
  if (today > circuit.availableUntil) return 'ended'
  return 'active'
}

/** Lo que se edita de un circuito; lo calculado (duración, insignias) lo pone el servidor. */
export interface CircuitInput {
  kind: CircuitKind
  title: string
  shortTitle: string
  subtitle: string
  category: string
  city: string
  difficulty: string
  stopIds: string[]
  travelMode: TravelMode
  legMinutes?: Record<string, number>
  startTimes: ClockTime[]
  priceAdult: number
  priceChild: number
  description: string
  images: string[]
  recommendations: string
  meetingPoint: string
  location: LatLng
  includes: string
  notes: string
  /** Sólo en los creativos: el nombre de la alcaldía. */
  organizer: string
  bonusBadges: number
  bookingMode: BookingMode
  availableFrom: ISODate | null
  availableUntil: ISODate | null
  draft: boolean
}

/** circuit_groups.json de la app. `daysFromNow` sólo existe en el mock. */
export interface CircuitGroupSession {
  id: string
  circuitId: string
  daysFromNow: number
  startTime: ClockTime
  capacity: number
  joinedCount: number
  guideId: string
  transportIncluded: boolean
  note: string
}

/** Un horario de grupo como lo ve el portal: con fecha y el nombre del guía. */
export interface GroupSessionView {
  id: string
  circuitId: string
  date: ISODate
  startTime: ClockTime
  capacity: number
  joinedCount: number
  guideName: string
  transportIncluded: boolean
  note: string
}

/** Los circuitos armados por turistas no están en el catálogo. */
export const USER_CIRCUIT_PREFIX = 'user-circuit-'

export function isUserCircuit(circuitId: string | null | undefined): boolean {
  return !!circuitId && circuitId.startsWith(USER_CIRCUIT_PREFIX)
}
