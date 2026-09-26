import type { ClockTime, LatLng } from './common'
import type { TravelMode } from '@/lib/itinerary'

export interface CircuitComment {
  author: string
  rating: number
  timeAgo: string
  text: string
}

/** circuits.json de la app. */
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

/** Los circuitos armados por turistas no están en el catálogo. */
export const USER_CIRCUIT_PREFIX = 'user-circuit-'

export function isUserCircuit(circuitId: string | null | undefined): boolean {
  return !!circuitId && circuitId.startsWith(USER_CIRCUIT_PREFIX)
}
