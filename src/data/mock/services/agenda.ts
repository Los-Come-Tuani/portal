/**
 * La agenda cultural en el backend de demo con el formato y las reglas del API
 * (docs/agenda-y-recompensas.md del repo del API): quién ve y quién programa cada evento, el estado
 * que pone el calendario y cómo se escribe uno en `snake_case`.
 */
import { todayISO, type ISODate, type LocalDateTime } from '@/lib/dates'
import { slugify } from '@/lib/slug'
import { clockToInput } from '@/lib/time'
import type { EventStatus, Organization, User } from '../../models'
import type { MockDatabase } from '../db'
import { fail } from '../http'
import { hasPermission } from './access'
import { actorOrganization, wireCity, wireInstant, wirePhoto } from './places'

/** Un evento como lo guarda la demo: la ciudad por su nombre y la organización por su id. */
export interface MockEvent {
  id: string
  name: string
  description: string
  /** El código de la clase: `musica`. */
  category: string
  city: string
  venue: string
  address: string
  latitude: number
  longitude: number
  startDate: ISODate
  endDate: ISODate
  /** `"18:00"`, como el API. */
  startTime: string
  endTime: string
  entryPrice: number
  featured: boolean
  cancelled: boolean
  cancellationReason: string
  /** La alcaldía que lo programa (`organizations[].id`); `null` es un especial de K'Plan. */
  organizerId: string | null
  pointId: string | null
  images: string[]
  clonedFromId: string | null
  createdAt: LocalDateTime
  hiddenAt: LocalDateTime | null
  hiddenReason: string
}

export const EVENT_CATEGORIES = [
  { code: 'tradicion', label: 'Tradición' },
  { code: 'feria', label: 'Feria' },
  { code: 'cultura', label: 'Cultura' },
  { code: 'taller', label: 'Taller' },
  { code: 'charla', label: 'Charla' },
  { code: 'musica', label: 'Música' },
  { code: 'gastronomia', label: 'Gastronomía' },
] as const

const NOT_FOUND = 'No encontramos ese evento.'

const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** De la etiqueta de la app (`"Música"`) al código del catálogo. */
export function categoryCode(label: string): string {
  return EVENT_CATEGORIES.find((item) => fold(item.label) === fold(label))?.code ?? 'cultura'
}

/** La vigencia la pone el calendario, como `sync_states` del API. */
export function eventStatus(event: MockEvent, today: ISODate = todayISO()): EventStatus {
  if (event.cancelled) return 'cancelled'
  if (event.endDate < today) return 'finished'
  if (event.startDate <= today) return 'ongoing'
  return 'scheduled'
}

/** La alcaldía verificada de quien entró: programa sus eventos (la demo no tiene instituciones). */
export function eventOrganizer(db: MockDatabase, user: User): Organization | null {
  const organization = actorOrganization(db, user)
  return organization?.type === 'alcaldia' ? organization : null
}

/** El equipo con `content.moderate` ve todos; la alcaldía, los suyos. Los demás, `403`. */
export function visibleEvents(db: MockDatabase, user: User): MockEvent[] {
  if (hasPermission(db, user, ['content.moderate'])) return db.agenda
  const organizer = eventOrganizer(db, user)
  if (!organizer) throw fail.forbidden()
  return db.agenda.filter((event) => event.organizerId === organizer.id)
}

export function visibleEvent(db: MockDatabase, user: User, eventId: string): MockEvent {
  const event = visibleEvents(db, user).find((item) => item.id === eventId)
  if (!event) throw fail.notFound(NOT_FOUND)
  return event
}

export function editableEvent(db: MockDatabase, user: User, eventId: string): MockEvent {
  const event = visibleEvent(db, user, eventId)
  const status = eventStatus(event)
  if (status === 'finished' || status === 'cancelled') throw fail.conflict('Un evento finalizado o cancelado ya no se edita.')
  return event
}

export function wireEvent(db: MockDatabase, event: MockEvent) {
  const organizer = db.organizations.find((item) => item.id === event.organizerId)
  const category = EVENT_CATEGORIES.find((item) => item.code === event.category) ?? { code: event.category, label: event.category }
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    category: { code: category.code, label: category.label },
    city: wireCity(event.city),
    venue: event.venue,
    address: event.address,
    latitude: event.latitude,
    longitude: event.longitude,
    start_date: event.startDate,
    end_date: event.endDate,
    start_time: event.startTime,
    end_time: event.endTime,
    entry_price: event.entryPrice,
    featured: event.featured,
    status: eventStatus(event),
    cancellation_reason: event.cancellationReason,
    organizer: organizer ? { kind: 'municipality' as const, id: organizer.id, name: organizer.name } : { kind: 'kplan' as const, id: null, name: "K'Plan" },
    point_id: event.pointId,
    images: event.images.map((key) => wirePhoto(db, key)),
    cloned_from_id: event.clonedFromId,
    created_at: wireInstant(event.createdAt),
    hidden: event.hiddenAt !== null,
    hidden_reason: event.hiddenReason,
  }
}

/** Un id legible para la demo: el nombre del evento y su fecha. */
export function eventId(db: MockDatabase, name: string, startDate: ISODate): string {
  const base = `${slugify(name)}-${startDate}`
  let candidate = base
  for (let index = 2; db.agenda.some((item) => item.id === candidate); index += 1) candidate = `${base}-${index}`
  return candidate
}

/** Las horas de la app (`"6:00 p.m."`) como las guarda el API. */
export const toWireClock = (value: string | undefined, fallback: string) => clockToInput(value) || fallback
