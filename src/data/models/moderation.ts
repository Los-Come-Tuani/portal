import type { LocalDateTime } from './common'

// ── Reseñas impugnadas (F7, docs/servicios.md) ────────────────────────────

export type DisputeStatus = 'pending' | 'upheld' | 'rejected'

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  pending: 'Por decidir',
  upheld: 'Reseña oculta',
  rejected: 'Reseña se mantiene',
}

export type ReviewDirection = 'tourist_to_guide' | 'guide_to_tourist'

export const REVIEW_DIRECTION_LABELS: Record<ReviewDirection, string> = {
  tourist_to_guide: 'El turista calificó al guía',
  guide_to_tourist: 'El guía calificó al turista',
}

/** El reseñado pide que el equipo con `content.moderate` revise una reseña; con `upheld`, se oculta. */
export interface ReviewDispute {
  id: string
  review: {
    id: string
    bookingId: string
    direction: ReviewDirection
    rating: number
    comment: string
    createdAt: LocalDateTime
    hidden: boolean
  }
  /** Quién escribió la reseña y a quién calificó. */
  author: string
  subject: string
  /** Quién la impugnó (el reseñado) y por qué. */
  raisedBy: string
  reason: string
  status: DisputeStatus
  createdAt: LocalDateTime
  resolvedAt: LocalDateTime | null
  note: string
}
