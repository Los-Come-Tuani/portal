import type { LocalDateTime } from './common'
import type { NewPlace } from './organization-application'

export type PlaceRequestStatus = 'pending' | 'approved' | 'rejected'

export const PLACE_REQUEST_STATUS_LABELS: Record<PlaceRequestStatus, string> = {
  pending: 'Por decidir',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

/**
 * Una organización ya aprobada pide administrar otro lugar: uno que ya está
 * en la app (`claim`) o uno nuevo, que se crea como borrador (`new`).
 */
export interface PlaceRequest {
  id: string
  organizationId: string
  organizationName: string
  requestedByName: string
  kind: 'claim' | 'new'
  stopId: string
  stopName: string
  /** Por qué es suyo, o algo que el equipo deba saber. */
  note: string
  status: PlaceRequestStatus
  requestedAt: LocalDateTime
  decidedAt: LocalDateTime | null
  decidedByName: string | null
  decisionNote: string
  /** Sólo en un lugar nuevo por decidir: lo mínimo para poder publicarlo. */
  readiness?: PlaceReadiness
}

export interface PlaceReadiness {
  photos: number
  /** Su pin no es el de otro lugar: se le copia uno de su ciudad al crearlo. */
  ownPin: boolean
}

/** Qué le falta a un lugar nuevo para aprobarlo; vacío si ya se puede. */
export function readinessGaps(readiness: PlaceReadiness): string[] {
  const gaps: string[] = []
  if (readiness.photos === 0) gaps.push('una foto')
  if (!readiness.ownPin) gaps.push('su ubicación en el mapa')
  return gaps
}

export type PlaceRequestInput =
  | { kind: 'claim'; stopId: string; note: string }
  | { kind: 'new'; newPlace: NewPlace; note: string }
