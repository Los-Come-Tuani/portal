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

// ── Reportes y sanciones (F8, docs/avisos.md) ─────────────────────────────

export type ReportStatus = 'pending' | 'handled' | 'dismissed'

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Por revisar',
  handled: 'Se actuó',
  dismissed: 'No procede',
}

export type ReportTargetKind = 'user' | 'review' | 'place' | 'event'

export const REPORT_TARGET_LABELS: Record<ReportTargetKind, string> = {
  user: 'Persona',
  review: 'Reseña',
  place: 'Lugar',
  event: 'Evento',
}

/** Lo que alguien reportó: una persona, una reseña, un lugar o un evento. */
export interface Report {
  id: string
  /** `label`: el nombre de la persona, del lugar o del evento, o un extracto de la reseña. */
  target: { kind: ReportTargetKind; id: string | null; label: string }
  reason: { code: string; label: string; requiresText: boolean }
  note: string
  reporter: string
  status: ReportStatus
  createdAt: LocalDateTime
  resolvedAt: LocalDateTime | null
  resolutionNote: string
}

export type SanctionKind = 'warning' | 'suspension' | 'expulsion'

export const SANCTION_KIND_LABELS: Record<SanctionKind, string> = {
  warning: 'Advertencia',
  suspension: 'Suspensión',
  expulsion: 'Expulsión',
}

/** Una sanción del equipo: suspender o expulsar corta de inmediato las sesiones de la persona. */
export interface Sanction {
  id: string
  userId: string
  userName: string
  kind: SanctionKind
  reason: string
  startsAt: LocalDateTime
  /** `null`: hasta que se levante (o para siempre, en una expulsión). */
  endsAt: LocalDateTime | null
  createdBy: string
  reportId: string | null
  liftedAt: LocalDateTime | null
  /** Sigue vigente. */
  active: boolean
}

export interface SanctionInput {
  userId: string
  kind: SanctionKind
  reason: string
  /** Sólo la suspensión: cuántos días dura; `null`, hasta que se levante. */
  days: number | null
  reportId: string | null
}
