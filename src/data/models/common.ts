export type { ISODate, LocalDateTime } from '@/lib/dates'

/** `"8:30 a.m."`, `"12:00 p.m."`: 12 horas, sin cero a la izquierda. */
export type ClockTime = string

/** `"30 min"`, `"2 h"`, `"1 h 30 min"` */
export type DurationText = string

export interface LatLng {
  latitude: number
  longitude: number
}

/**
 * Una foto como la guarda el API: la clave es lo que se manda al guardar; la URL es solo para
 * mostrarla y, si es del almacenamiento, vence en minutos. Las de ejemplo son direcciones
 * públicas y su clave es la misma dirección.
 */
export interface Photo {
  key: string
  /** `null` si el almacenamiento no está configurado. */
  url: string | null
}

/** La portada: la primera foto que se puede mostrar. */
export function coverUrl(images: readonly Photo[]): string | undefined {
  return images.find((image) => !!image.url)?.url ?? undefined
}

/** Ciudades del catálogo, con su departamento (para `location` de los eventos). */
export const CITIES = [
  { name: 'Granada', department: 'Granada' },
  { name: 'León', department: 'León' },
  { name: 'Masaya', department: 'Masaya' },
  { name: 'Estelí', department: 'Estelí' },
  { name: 'Matagalpa', department: 'Matagalpa' },
  { name: 'Rivas', department: 'Rivas' },
] as const

export type City = (typeof CITIES)[number]['name']

export function cityLocation(city: string): string {
  const match = CITIES.find((item) => item.name === city)
  return match ? `${match.name}, ${match.department}` : city
}
