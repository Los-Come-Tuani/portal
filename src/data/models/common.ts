export type { ISODate, LocalDateTime } from '@/lib/dates'

/** `"8:30 a.m."`, `"12:00 p.m."`: 12 horas, sin cero a la izquierda. */
export type ClockTime = string

/** `"30 min"`, `"2 h"`, `"1 h 30 min"` */
export type DurationText = string

export interface LatLng {
  latitude: number
  longitude: number
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
