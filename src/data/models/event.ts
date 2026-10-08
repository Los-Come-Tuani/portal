import type { ClockTime, ISODate, LatLng, Photo } from './common'

/**
 * Los eventos de la agenda cultural (F6, docs/agenda-y-recompensas.md del repo del API). Los
 * programan las instituciones y las alcaldías verificadas; el equipo con `content.moderate`, los
 * especiales de K'Plan. La vigencia la pone el calendario: nadie publica ni despublica.
 */
export type EventStatus = 'scheduled' | 'ongoing' | 'finished' | 'cancelled'

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: 'Próximo',
  ongoing: 'En curso',
  finished: 'Terminó',
  cancelled: 'Cancelado',
}

/** Una clase de evento del catálogo (`catalog/event-category/`): `musica`, "Música". */
export interface EventCategory {
  code: string
  label: string
}

export type EventOrganizerKind = 'institution' | 'municipality' | 'kplan'

export interface EventOrganizer {
  kind: EventOrganizerKind
  /** `null` en los especiales de K'Plan. */
  id: string | null
  name: string
}

export interface CulturalEvent {
  id: string
  name: string
  description: string
  category: EventCategory
  /** La ciudad donde ocurre, que no tiene que ser la de quien lo programa. */
  cityId: string
  cityCode: string
  city: string
  venue: string
  address: string
  location: LatLng
  startDate: ISODate
  endDate: ISODate
  /** El horario de cada día, como lo lee la app (`"6:00 p.m."`); un fin menor termina de madrugada. */
  startTime: ClockTime
  endTime: ClockTime
  /** Córdobas; 0 es entrada libre. */
  entryPrice: number
  /** Destacado en el inicio de la app: lo decide el equipo. */
  featured: boolean
  status: EventStatus
  cancellationReason: string
  organizer: EventOrganizer
  /** El lugar del mapa donde ocurre, si es uno. */
  pointId: string | null
  images: Photo[]
  clonedFromId: string | null
  createdAt: string
  /** Lo ocultó el equipo: no sale en la app. */
  hidden: boolean
  hiddenReason: string
}

/** Lo que se programa o se corrige; las horas como las da un `<input type="time">` (`"18:00"`). */
export interface EventInput {
  cityId: string
  category: string
  name: string
  description: string
  venue: string
  address: string
  location: LatLng
  startDate: ISODate
  endDate: ISODate
  startTime: string
  endTime: string
  entryPrice: number
  pointId: string | null
  images: Photo[]
  featured: boolean
}

/** Un evento finalizado o cancelado ya no se edita. */
export const isEditableEvent = (event: Pick<CulturalEvent, 'status'>) => event.status === 'scheduled' || event.status === 'ongoing'
