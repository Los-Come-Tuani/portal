/**
 * La moderación del equipo en el backend de demo, con el formato del API: las reseñas impugnadas
 * (docs/servicios.md del repo del API), los reportes y las sanciones (docs/avisos.md).
 */
import { addDays, toLocalDateTime, type ISODate, type LocalDateTime } from '@/lib/dates'
import type { DisputeStatus, ReportStatus, ReportTargetKind, ReviewDirection, SanctionKind } from '../../models'
import type { MockDatabase } from '../db'
import { wireInstant } from './places'

export interface MockDispute {
  id: string
  reviewId: string
  bookingId: string
  direction: ReviewDirection
  rating: number
  comment: string
  reviewedAt: LocalDateTime
  hidden: boolean
  author: string
  subject: string
  raisedBy: string
  reason: string
  status: DisputeStatus
  createdAt: LocalDateTime
  resolvedAt: LocalDateTime | null
  note: string
}

export function wireDispute(dispute: MockDispute) {
  return {
    id: dispute.id,
    review: {
      id: dispute.reviewId,
      booking_id: dispute.bookingId,
      direction: dispute.direction,
      rating: dispute.rating,
      comment: dispute.comment,
      created_at: wireInstant(dispute.reviewedAt),
      hidden: dispute.hidden,
    },
    author: dispute.author,
    subject: dispute.subject,
    raised_by: dispute.raisedBy,
    reason: dispute.reason,
    status: dispute.status,
    created_at: wireInstant(dispute.createdAt),
    resolved_at: dispute.resolvedAt ? wireInstant(dispute.resolvedAt) : null,
    note: dispute.note,
  }
}

/** Unas impugnaciones de ejemplo: dos por decidir y una ya resuelta. */
export function seedDisputes(today: ISODate, guides: readonly string[], tourists: readonly string[]): MockDispute[] {
  const guide = (index: number) => guides[index % Math.max(1, guides.length)] ?? 'Guía certificado'
  const at = (days: number, minutes: number) => toLocalDateTime(addDays(today, -days), minutes)
  return [
    {
      id: 'impugnacion-1',
      reviewId: 'resena-1',
      bookingId: 'reserva-1',
      direction: 'tourist_to_guide',
      rating: 1,
      comment: 'Nunca llegó al punto de encuentro y no contestaba el chat.',
      reviewedAt: at(3, 18 * 60),
      hidden: false,
      author: tourists[0] ?? 'Turista',
      subject: guide(0),
      raisedBy: guide(0),
      reason: 'Llegué a la hora acordada; el turista estaba en otro parque. Tengo los mensajes del chat.',
      status: 'pending',
      createdAt: at(2, 9 * 60),
      resolvedAt: null,
      note: '',
    },
    {
      id: 'impugnacion-2',
      reviewId: 'resena-2',
      bookingId: 'reserva-2',
      direction: 'guide_to_tourist',
      rating: 2,
      comment: 'Llegó tarde y se quejó todo el recorrido.',
      reviewedAt: at(5, 17 * 60),
      hidden: false,
      author: guide(1),
      subject: tourists[1] ?? 'Turista',
      raisedBy: tourists[1] ?? 'Turista',
      reason: 'El retraso fue del bus que contrató el guía, no mío. La reseña no es justa.',
      status: 'pending',
      createdAt: at(4, 11 * 60),
      resolvedAt: null,
      note: '',
    },
    {
      id: 'impugnacion-3',
      reviewId: 'resena-3',
      bookingId: 'reserva-3',
      direction: 'tourist_to_guide',
      rating: 1,
      comment: 'Este guía es un estafador, no lo contraten.',
      reviewedAt: at(12, 20 * 60),
      hidden: true,
      author: tourists[2] ?? 'Turista',
      subject: guide(2),
      raisedBy: guide(2),
      reason: 'Insultos sin relación con el recorrido.',
      status: 'upheld',
      createdAt: at(11, 10 * 60),
      resolvedAt: at(10, 15 * 60),
      note: 'Lenguaje ofensivo.',
    },
  ]
}

export const findDispute = (db: MockDatabase, disputeId: string) => db.reviewDisputes.find((item) => item.id === disputeId)

// ── Reportes y sanciones (docs/avisos.md) ──

export const REPORT_REASONS = [
  { code: 'contenido_inapropiado', label: 'Contenido inapropiado', requires_text: false },
  { code: 'acoso', label: 'Acoso', requires_text: false },
  { code: 'fraude', label: 'Fraude', requires_text: false },
  { code: 'informacion_falsa', label: 'Información falsa', requires_text: false },
  { code: 'incumplimiento', label: 'Incumplimiento', requires_text: false },
  { code: 'otro', label: 'Otro', requires_text: true },
] as const

export interface MockReport {
  id: string
  targetKind: ReportTargetKind
  targetId: string | null
  targetLabel: string
  reason: string
  note: string
  reporter: string
  status: ReportStatus
  createdAt: LocalDateTime
  resolvedAt: LocalDateTime | null
  resolutionNote: string
}

export interface MockSanction {
  id: string
  userId: string
  userName: string
  kind: SanctionKind
  reason: string
  startsAt: LocalDateTime
  endsAt: LocalDateTime | null
  createdBy: string
  reportId: string | null
  liftedAt: LocalDateTime | null
}

export function wireReport(report: MockReport) {
  const reason = REPORT_REASONS.find((item) => item.code === report.reason) ?? { code: report.reason, label: report.reason, requires_text: false }
  return {
    id: report.id,
    target: { kind: report.targetKind, id: report.targetId, label: report.targetLabel },
    reason: { code: reason.code, label: reason.label, requires_text: reason.requires_text },
    note: report.note,
    reporter: report.reporter,
    status: report.status,
    created_at: wireInstant(report.createdAt),
    resolved_at: report.resolvedAt ? wireInstant(report.resolvedAt) : null,
    resolution_note: report.resolutionNote,
  }
}

/** Como `sanction_active` del API: una advertencia nunca queda vigente. */
export function sanctionActive(sanction: MockSanction, now: LocalDateTime): boolean {
  if (sanction.kind === 'warning' || sanction.liftedAt) return false
  return sanction.endsAt === null || sanction.endsAt > now
}

export function wireSanction(sanction: MockSanction, now: LocalDateTime) {
  return {
    id: sanction.id,
    user_id: sanction.userId,
    user_name: sanction.userName,
    kind: sanction.kind,
    reason: sanction.reason,
    starts_at: wireInstant(sanction.startsAt),
    ends_at: sanction.endsAt ? wireInstant(sanction.endsAt) : null,
    created_by: sanction.createdBy,
    report_id: sanction.reportId,
    lifted_at: sanction.liftedAt ? wireInstant(sanction.liftedAt) : null,
    active: sanctionActive(sanction, now),
  }
}

/** Unos reportes de ejemplo: una persona, una reseña, un lugar y un evento. */
export function seedReports(
  today: ISODate,
  targets: { user: { id: string; name: string } | null; place: { id: string; name: string } | null; event: { id: string; name: string } | null },
  tourists: readonly string[],
): MockReport[] {
  const at = (days: number, minutes: number) => toLocalDateTime(addDays(today, -days), minutes)
  const base = { status: 'pending' as const, resolvedAt: null, resolutionNote: '' }
  const reports: MockReport[] = [
    {
      ...base,
      id: 'reporte-resena',
      targetKind: 'review',
      targetId: 'resena-1',
      targetLabel: '«Nunca llegó al punto de encuentro y no contestaba…»',
      reason: 'informacion_falsa',
      note: 'El guía sí llegó; yo iba en ese grupo.',
      reporter: tourists[3] ?? 'Turista',
      createdAt: at(1, 10 * 60),
    },
  ]
  if (targets.user) {
    reports.push({
      ...base,
      id: 'reporte-persona',
      targetKind: 'user',
      targetId: targets.user.id,
      targetLabel: targets.user.name,
      reason: 'acoso',
      note: 'Me escribió fuera del chat de la reserva varias veces.',
      reporter: tourists[4] ?? 'Turista',
      createdAt: at(2, 16 * 60),
    })
  }
  if (targets.place) {
    reports.push({
      ...base,
      id: 'reporte-lugar',
      targetKind: 'place',
      targetId: targets.place.id,
      targetLabel: targets.place.name,
      reason: 'otro',
      note: 'El horario de la ficha no coincide: estaba cerrado a las 3 p.m.',
      reporter: tourists[5] ?? 'Turista',
      status: 'handled',
      createdAt: at(6, 15 * 60),
      resolvedAt: at(5, 9 * 60),
      resolutionNote: 'Se corrigió el horario con la alcaldía.',
    })
  }
  if (targets.event) {
    reports.push({
      ...base,
      id: 'reporte-evento',
      targetKind: 'event',
      targetId: targets.event.id,
      targetLabel: targets.event.name,
      reason: 'contenido_inapropiado',
      note: '',
      reporter: tourists[6] ?? 'Turista',
      status: 'dismissed',
      createdAt: at(9, 11 * 60),
      resolvedAt: at(8, 10 * 60),
      resolutionNote: 'El evento es correcto.',
    })
  }
  return reports
}
