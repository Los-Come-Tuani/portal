import type { ClockTime, ISODate, LatLng } from './common'

export const EVENT_CATEGORIES = [
  'Tradición',
  'Feria',
  'Cultura',
  'Taller',
  'Charla',
  'Música',
  'Gastronomía',
] as const

export type EventStatus = 'published' | 'hidden'

/** events.json de la app, más los campos que agrega el portal. */
export interface EventItem {
  id: string
  title: string
  /** Texto "ciudad, departamento": `"León, León"`. */
  location: string
  date: ISODate
  /** `"7 dic"`, se deriva de `date`. */
  dateLabel: string
  image: string
  category: string
  address: string
  description: string
  images: string[]
  /** C$; 0 = entrada libre. */
  price: number
  coordinates: LatLng

  /* Portal (propuesta; la app todavía no los lee) */
  /** `null` = evento especial de K'Plan. */
  organizerId: string | null
  startTime?: ClockTime
  endTime?: ClockTime
  /** Lugar de la organización donde pasa, si aplica. */
  stopId: string | null
  status: EventStatus
  /** Destacado en el inicio de la app (lo decide K'Plan). */
  featured: boolean
}

export type EventInput = Omit<EventItem, 'id' | 'dateLabel' | 'image' | 'featured'> & {
  featured?: boolean
}
