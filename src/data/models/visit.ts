import type { LocalDateTime } from './common'

/** Por qué se quitó o no se visitó una parada (visit_event.dart). */
export const DROP_REASONS = {
  closed: 'Estaba cerrado',
  too_far: 'Muy lejos o sin transporte',
  no_time: 'Falta de tiempo',
  too_expensive: 'Muy caro',
  not_interested: 'No me interesó',
  weather: 'Por el clima',
  other: 'Otro motivo',
} as const

export type DropReason = keyof typeof DROP_REASONS

export type DropStage = 'planning' | 'trip' | 'trip_ended'

export const DROP_STAGE_LABELS: Record<DropStage, string> = {
  planning: 'Al planear',
  trip: 'Durante el viaje',
  trip_ended: 'Al terminar el viaje',
}

/** Un grupo agendó pasar por el lugar en esa franja. */
export interface PlannedVisit {
  type: 'planned_visit'
  stopId: string
  circuitId: string
  bookingId: string | null
  arrival: LocalDateTime
  departure: LocalDateTime
  groupSize: number
  recordedAt: LocalDateTime
}

/** El turista escaneó el QR del lugar: llegó de verdad. */
export interface CheckIn {
  type: 'check_in'
  stopId: string
  /** `null` si escaneó sin un viaje en curso. */
  circuitId: string | null
  groupSize: number | null
  recordedAt: LocalDateTime
}

export interface StopDropped {
  type: 'stop_dropped'
  stopId: string
  circuitId: string
  reason: DropReason
  stage: DropStage
  recordedAt: LocalDateTime
}

export type VisitEvent = PlannedVisit | CheckIn | StopDropped
