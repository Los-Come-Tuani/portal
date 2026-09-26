import type { ClockTime, DurationText, LatLng } from './common'

/** Lista cerrada: la app tiene íconos, filtros y medallas por categoría. */
export const STOP_CATEGORIES = ['Historia', 'Cultura', 'Gastronomía', 'Naturaleza', 'Aventura'] as const
export type StopCategory = (typeof STOP_CATEGORIES)[number]

/** stops.json de la app, campo por campo. En el portal, una parada es "un lugar". */
export interface Stop {
  id: string
  name: string
  category: StopCategory
  city: string
  address: string
  /** Van los dos o ninguno; sin horario = no cierra (parque, calle, mirador). */
  opensAt?: ClockTime
  closesAt?: ClockTime
  /** Tiempo sugerido de visita. */
  duration: DurationText
  /** Lo generan los turistas: sólo lectura. */
  rating: number
  reviewsCount: number
  /** Su QR da una insignia de su categoría. Se activa pagando (ver insignias). */
  hasBadge: boolean
  description: string
  tip: string
  /** URLs; la primera es la portada. */
  images: string[]
  coordinates: LatLng
}

/** Lo que una organización puede editar de su lugar. */
export type StopInput = Pick<
  Stop,
  | 'name'
  | 'category'
  | 'address'
  | 'opensAt'
  | 'closesAt'
  | 'duration'
  | 'description'
  | 'tip'
  | 'images'
  | 'coordinates'
>
