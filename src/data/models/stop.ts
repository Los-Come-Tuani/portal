import type { OrganizationKind } from './application'
import type { ClockTime, DurationText, LatLng, Photo } from './common'

/** Lista cerrada: la app tiene íconos, filtros y medallas por categoría. */
export const STOP_CATEGORIES = ['Historia', 'Cultura', 'Gastronomía', 'Naturaleza', 'Aventura'] as const
export type StopCategory = (typeof STOP_CATEGORIES)[number]

/** El pilar cultural del API (`GET /catalog/pillar/`) de cada categoría. */
export const PILLAR_CODES: Record<StopCategory, string> = {
  Historia: 'historia',
  Cultura: 'cultura',
  Gastronomía: 'gastronomia',
  Naturaleza: 'naturaleza',
  Aventura: 'aventura',
}

/** La categoría de un pilar del API; uno que el portal no conoce se muestra como Cultura. */
export function categoryOfPillar(code: string): StopCategory {
  return STOP_CATEGORIES.find((category) => PILLAR_CODES[category] === code) ?? 'Cultura'
}

/** La organización dueña de un lugar: lo edita y publica sus novedades. */
export interface PlaceOwner {
  kind: OrganizationKind
  id: string
  name: string
}

/** Un lugar del portal: la parada que la app muestra en el mapa. */
export interface Stop {
  id: string
  name: string
  category: StopCategory
  /** El nombre de la ciudad, como lo muestra la app. */
  city: string
  cityId: string
  address: string
  /** Van los dos o ninguno; sin horario = no cierra (parque, calle, mirador). */
  opensAt?: ClockTime
  closesAt?: ClockTime
  /** Tiempo sugerido de visita. */
  duration: DurationText
  /** Lo generan los turistas: sólo lectura. */
  rating: number
  reviewsCount: number
  /** Su QR da una insignia de su categoría. La cambia el equipo con `places.manage`. */
  hasBadge: boolean
  description: string
  tip: string
  /** La primera es la portada. */
  images: Photo[]
  coordinates: LatLng
  /** Uno retirado no sale en la app, pero no se borra. */
  active: boolean
  /** `null`: lo administra el equipo de K'Plan. */
  owner: PlaceOwner | null
  /** En cuántos circuitos publicados está: mientras esté en alguno, no se retira. */
  publishedCircuits: number
}

/** Lo que su dueño puede editar de su lugar. */
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

/** Un lugar nuevo: el equipo elige la ciudad; la alcaldía lo crea en la suya (`cityId` nulo). */
export interface NewStopInput {
  cityId: string | null
  name: string
  category: StopCategory
  address: string
  coordinates: LatLng
}

/** Los filtros de `GET place/`: los aplica el API. */
export interface StopFilters {
  cityId?: string
  ownerKind?: OrganizationKind | 'none'
  ownerId?: string
  active?: boolean
  search?: string
}
