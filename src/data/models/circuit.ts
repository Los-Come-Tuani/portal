import type { ClockTime, ISODate, LatLng, Photo } from './common'
import type { Stop } from './stop'
import type { TravelMode } from '@/lib/itinerary'

/** Cómo se hace: cada grupo agenda el suyo, o se inscribe en una salida de grupo con guía. */
export type BookingMode = 'private' | 'group'

export type CircuitKind = 'kplan' | 'creative' | 'private'

/**
 * Los estados del API (docs/territorio.md): `draft` y `unpublished` no están en la app; uno
 * `retired` ya no se edita.
 */
export type CircuitStatus = 'draft' | 'published' | 'unpublished' | 'retired'

export const CIRCUIT_KIND_LABELS: Record<CircuitKind, string> = {
  kplan: "Especial de K'Plan",
  creative: 'Creativo',
  private: 'Privado',
}

/** Las de los datos más Cultura, que la app ya pinta con su propio color. */
export const CIRCUIT_CATEGORIES = ['Ciudad', 'Naturaleza', 'Cultura'] as const
export type CircuitCategory = (typeof CIRCUIT_CATEGORIES)[number]
export const CIRCUIT_DIFFICULTIES = ['Fácil', 'Moderado'] as const
export type CircuitDifficulty = (typeof CIRCUIT_DIFFICULTIES)[number]

/** Cómo las nombra el API. */
export const CIRCUIT_CATEGORY_CODES = { Ciudad: 'city', Naturaleza: 'nature', Cultura: 'culture' } as const satisfies Record<CircuitCategory, string>
export const CIRCUIT_DIFFICULTY_CODES = { Fácil: 'easy', Moderado: 'moderate' } as const satisfies Record<CircuitDifficulty, string>

export const KPLAN_BADGE_CATEGORY = "Circuitos K'Plan"
export const CREATIVE_BONUS_BADGES = 3
export const MAX_BONUS_BADGES = 5

/** La alcaldía que organiza un creativo. */
export interface CircuitOrganizer {
  id: string
  name: string
}

/** Un circuito oficial del portal (`official-circuit/`), con los nombres que muestra la app. */
export interface Circuit {
  id: string
  kind: CircuitKind
  status: CircuitStatus
  title: string
  shortTitle: string
  subtitle: string
  category: CircuitCategory
  /** El nombre de la ciudad, como lo muestra la app. */
  city: string
  cityId: string
  cityCode: string
  /** Sólo en los creativos. */
  organizer: CircuitOrganizer | null
  rating: number
  reviewsCount: number
  stopIds: string[]
  /** Sólo en el detalle: el lugar de cada parada, también los que ya se retiraron. */
  stops?: Stop[]
  travelMode: TravelMode
  /** Traslados fijos hacia una parada desde la anterior; sin valor, lo calcula la app. */
  legMinutes?: Record<string, number>
  /** Cómo llegar a una parada desde la anterior: el portal no los edita, pero los conserva. */
  directions?: Record<string, string>
  duration: string
  durationShort: string
  /** Las insignias de sus paradas; las extra van en `bonusBadges`. */
  badges: number
  /** Insignias extra al completarlo: tres en los creativos, las que elija un especial. */
  bonusBadges: number
  /** Los creativos siempre son en grupo; los privados, privados; un especial elige. */
  bookingMode: BookingMode
  difficulty: CircuitDifficulty
  priceAdult: number
  priceChild: number
  description: string
  /** La primera es la portada. */
  images: Photo[]
  recommendations: string
  meetingPoint: string
  location: LatLng
  includes: string
  notes: string
  startTimes: ClockTime[]
  /** De temporada: la app lo muestra sólo entre estas fechas (van las dos o ninguna). */
  availableFrom?: ISODate
  availableUntil?: ISODate
  /** Sube cuando cambian las paradas o su orden: la app redibuja el recorrido. */
  version: number
}

/** Fuera de la app pero se puede publicar: un borrador o uno que se sacó de la app. */
export function isUnpublished(circuit: Pick<Circuit, 'status'>): boolean {
  return circuit.status === 'draft' || circuit.status === 'unpublished'
}

export type SeasonState = 'always' | 'upcoming' | 'active' | 'ended'

export function seasonState(circuit: Pick<Circuit, 'availableFrom' | 'availableUntil'>, today: ISODate): SeasonState {
  if (!circuit.availableFrom || !circuit.availableUntil) return 'always'
  if (today < circuit.availableFrom) return 'upcoming'
  if (today > circuit.availableUntil) return 'ended'
  return 'active'
}

/** Lo que se edita de un circuito; lo calculado (duración, insignias, versión) lo pone el API. */
export interface CircuitInput {
  kind: CircuitKind
  /** La ciudad del catálogo; la alcaldía sólo crea en la suya. */
  cityId: string
  title: string
  shortTitle: string
  subtitle: string
  category: CircuitCategory
  difficulty: CircuitDifficulty
  stopIds: string[]
  travelMode: TravelMode
  legMinutes?: Record<string, number>
  directions?: Record<string, string>
  startTimes: ClockTime[]
  priceAdult: number
  priceChild: number
  description: string
  images: Photo[]
  recommendations: string
  meetingPoint: string
  location: LatLng
  includes: string
  notes: string
  bonusBadges: number
  bookingMode: BookingMode
  availableFrom: ISODate | null
  availableUntil: ISODate | null
  /** Un borrador no sale en la app; sacar de la app uno publicado lo deja `unpublished`. */
  draft: boolean
}

export interface CircuitFilters {
  /** Sin estado: todos menos los retirados. */
  status?: CircuitStatus
}

/** circuit_groups.json de la app: los horarios de grupo de la demo. `daysFromNow` sólo existe en el mock. */
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
  /** La demo la cancela al despublicar o retirar el circuito, como el API. */
  cancelled?: boolean
}

/**
 * Una salida de guía de un circuito (`official-circuit/{id}/departure/`, F7): la publica el guía. El
 * portal ve también las canceladas, aunque el circuito ya no esté publicado.
 */
export interface Departure {
  id: string
  circuitId: string
  date: ISODate
  startTime: ClockTime
  capacity: number
  /** Cuántas personas ya reservaron y cuántos cupos quedan. */
  booked: number
  remaining: number
  /** En un circuito privado: la primera reserva se la queda. */
  exclusive: boolean
  guideName: string
  transportIncluded: boolean
  note: string
  /** La canceló el guía, o el circuito salió de la app: sus reservas se cancelaron. */
  cancelled: boolean
}

/** Los circuitos armados por turistas no están en el catálogo. */
export const USER_CIRCUIT_PREFIX = 'user-circuit-'

export function isUserCircuit(circuitId: string | null | undefined): boolean {
  return !!circuitId && circuitId.startsWith(USER_CIRCUIT_PREFIX)
}
