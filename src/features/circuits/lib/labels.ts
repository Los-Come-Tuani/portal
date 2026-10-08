import type { TagTone } from '@/components/ui'
import { seasonState, type Circuit } from '@/data/models'
import type { ISODate } from '@/lib/dates'
import { formatDayMonth, formatMoney } from '@/lib/format'

/** Si está en la app y hasta cuándo: borrador, sacado de la app, retirado, temporada o siempre. */
export function circuitStatus(circuit: Circuit, today: ISODate): { label: string; tone: TagTone; detail: string | null } {
  if (circuit.status === 'retired') return { label: 'Retirado', tone: 'outline', detail: 'Ya no se edita' }
  if (circuit.status === 'draft') return { label: 'Borrador', tone: 'neutral', detail: 'No está en la app' }
  if (circuit.status === 'unpublished') return { label: 'Fuera de la app', tone: 'neutral', detail: 'Se puede volver a publicar' }
  const season = seasonState(circuit, today)
  const from = circuit.availableFrom ? formatDayMonth(circuit.availableFrom) : ''
  const until = circuit.availableUntil ? formatDayMonth(circuit.availableUntil) : ''
  switch (season) {
    case 'upcoming':
      return { label: 'Publicado', tone: 'confirmed', detail: `Su temporada empieza el ${from}` }
    case 'active':
      return { label: 'En temporada', tone: 'confirmed', detail: `Hasta el ${until}` }
    case 'ended':
      return { label: 'Temporada terminada', tone: 'danger', detail: `El ${until}: sácalo de la app` }
    default:
      return { label: 'Publicado', tone: 'confirmed', detail: null }
  }
}

export function bookingLabel(circuit: Circuit): string {
  const price = circuit.priceAdult === 0 ? 'gratis' : formatMoney(circuit.priceAdult)
  return `${circuit.bookingMode === 'group' ? 'En grupo' : 'Privado'} · ${price}`
}
