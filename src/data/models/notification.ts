import type { LocalDateTime } from './common'

/** Las clases de aviso del API (docs/avisos.md); llegan otras en el futuro y se muestran igual. */
export const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  mensaje: 'Mensaje',
  reserva: 'Reserva',
  convocatoria: 'Convocatoria',
  resena: 'Reseña',
  pago: 'Pago',
  cuenta: 'Tu cuenta',
}

/** Un aviso de la bandeja de la cuenta (`notification/`). */
export interface AppNotification {
  id: string
  kind: string
  title: string
  body: string
  /** A qué apunta: `booking_id`, `withdrawal_id`... */
  data: Record<string, string>
  read: boolean
  createdAt: LocalDateTime
}
