/**
 * La moderación del equipo en el backend de demo, con el formato del API: las reseñas impugnadas
 * (docs/servicios.md del repo del API).
 */
import { addDays, toLocalDateTime, type ISODate, type LocalDateTime } from '@/lib/dates'
import type { DisputeStatus, ReviewDirection } from '../../models'
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
