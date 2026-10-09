import type { LocalDateTime, Photo } from './common'

/*
 * Secciones nuevas del perfil de un lugar. La app todavía no las muestra:
 * es el formato propuesto para cuando lo haga.
 */

export const AMENITIES = [
  { id: 'card', label: 'Acepta tarjeta' },
  { id: 'parking', label: 'Parqueo' },
  { id: 'wifi', label: 'Wifi' },
  { id: 'accessible', label: 'Acceso para silla de ruedas' },
  { id: 'restrooms', label: 'Baños' },
  { id: 'air-conditioning', label: 'Aire acondicionado' },
  { id: 'kids', label: 'Apto para niños' },
  { id: 'pets', label: 'Se admiten mascotas' },
  { id: 'reservations', label: 'Acepta reservaciones' },
] as const

export type AmenityId = (typeof AMENITIES)[number]['id']

export const LANGUAGES = ['Español', 'Inglés', 'Francés', 'Alemán', 'Portugués', 'Italiano'] as const

export interface Offering {
  id: string
  name: string
  description: string
  /** C$; `null` = precio a consultar. */
  price: number | null
}

export interface PlaceContact {
  phone: string
  whatsapp: string
  email: string
  website: string
  instagram: string
  facebook: string
}

export interface PlaceProfile {
  stopId: string
  offerings: Offering[]
  amenities: AmenityId[]
  languages: string[]
  contact: PlaceContact
  /** `null`: nadie la ha llenado todavía. */
  updatedAt: LocalDateTime | null
}

export type PlaceProfileInput = Omit<PlaceProfile, 'stopId' | 'updatedAt'>

/** `hidden` sigue guardada pero no sale en la app (`visible: false` en el API). */
export type PostStatus = 'published' | 'hidden'

/** Una novedad: publicación corta con foto (menú de temporada, avisos…). */
export interface Post {
  id: string
  stopId: string
  title: string
  body: string
  image: Photo | null
  publishedAt: LocalDateTime
  status: PostStatus
}

export type PostInput = Pick<Post, 'stopId' | 'title' | 'body' | 'image' | 'status'>
