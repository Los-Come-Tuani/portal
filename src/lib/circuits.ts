/**
 * Los campos que el portal calcula de un circuito (docs/CONTEXTO_KPLAN.md,
 * sección 8.2): no se escriben a mano, para que coincidan con el itinerario
 * que arma la app.
 */
import { CREATIVE_BONUS_BADGES, KPLAN_BADGE_CATEGORY, type CircuitKind } from '@/data/models/circuit'
import { planItinerary, type ItineraryWarning, type PlannerStop, type TravelMode } from './itinerary'
import { formatDuration } from './format'
import { parseClock } from './time'

export interface CircuitStop extends PlannerStop {
  hasBadge: boolean
}

interface DeriveInput {
  stops: readonly CircuitStop[]
  travelMode: TravelMode
  legMinutes?: Readonly<Record<string, number>>
  kind: CircuitKind
  bonusBadges: number
  city: string
}

export interface CircuitDerived {
  totalMinutes: number
  duration: string
  durationShort: string
  badges: number
  badgesNote: string
}

/** 8 h o más es `1 día`; si no, las horas redondeadas: 4 h 20 min → `4 h aprox.`. */
export function durationShortText(minutes: number): string {
  if (minutes >= 8 * 60) return '1 día'
  return `${Math.max(1, Math.round(minutes / 60))} h aprox.`
}

export function badgesNoteText({ badges, kind, bonusBadges, city }: Pick<DeriveInput, 'kind' | 'bonusBadges' | 'city'> & { badges: number }): string {
  const base = `Este recorrido contiene un total de ${badges} insignias coleccionables`
  if (kind === 'creative') {
    return `${base}, más ${CREATIVE_BONUS_BADGES} insignias extra de "Circuitos creativos" y una medalla de ${city} al completarlo`
  }
  if (kind === 'kplan' && bonusBadges > 0) {
    return `${base}, más ${bonusBadges} ${bonusBadges === 1 ? 'insignia extra' : 'insignias extra'} de "${KPLAN_BADGE_CATEGORY}" al completarlo`
  }
  return base
}

/** Con el ritmo equilibrado: la duración no depende de la hora de salida. */
export function deriveCircuit(input: DeriveInput): CircuitDerived {
  const totalMinutes = planItinerary({ stops: input.stops, start: 0, mode: input.travelMode, legMinutes: input.legMinutes }).totalMinutes
  const badges = input.stops.filter((stop) => stop.hasBadge).length
  return {
    totalMinutes,
    duration: formatDuration(totalMinutes),
    durationShort: durationShortText(totalMinutes),
    badges,
    badgesNote: badgesNoteText({ badges, kind: input.kind, bonusBadges: input.bonusBadges, city: input.city }),
  }
}

export interface StartTimeCheck {
  startTime: string
  warnings: ItineraryWarning[]
  /** Avisos de horario (cerrado, termina de noche): la app exige que ninguna hora de salida publicada los tenga. */
  blocking: ItineraryWarning[]
}

export function checkStartTimes(input: Pick<DeriveInput, 'stops' | 'travelMode' | 'legMinutes'>, startTimes: readonly string[]): StartTimeCheck[] {
  return startTimes.map((startTime) => {
    const start = parseClock(startTime)
    if (start === null || input.stops.length === 0) return { startTime, warnings: [], blocking: [] }
    const { warnings } = planItinerary({ stops: input.stops, start, mode: input.travelMode, legMinutes: input.legMinutes })
    return { startTime, warnings, blocking: warnings.filter((warning) => warning.kind !== 'longWalk') }
  })
}
