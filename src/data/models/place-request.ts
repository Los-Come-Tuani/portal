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
}

export type PlaceRequestInput =
  | { kind: 'claim'; stopId: string; note: string }
  | { kind: 'new'; newPlace: NewPlace; note: string }
