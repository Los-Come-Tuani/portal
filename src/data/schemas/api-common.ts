import { z } from 'zod'
import { nowLocalDateTime, todayISO, type ISODate, type LocalDateTime } from '@/lib/dates'
import type { Page } from '../models'

/** Un instante del API (`2026-10-08T15:00:00Z`) en la hora de Managua, como lo muestra el portal. */
export const toLocalDateTime = (instant: string): LocalDateTime => nowLocalDateTime(new Date(instant))

/** El día de Managua de un instante del API. */
export const toLocalDate = (instant: string): ISODate => todayISO(new Date(instant))

/** Lo que se repite en las respuestas del API: fotos por su clave, la ciudad y las páginas. */

export const apiImageSchema = z.object({ key: z.string(), url: z.string().nullable() })

export const apiCitySchema = z.object({ id: z.string(), code: z.string(), name: z.string() })

/** Una opción de un catálogo cerrado: `{ code, label }` (pilares, clases de evento, motivos). */
export const apiOptionSchema = z.object({ code: z.string(), label: z.string() })

/** `paginate` del API: `{ next, previous, elements, pages, current, results }`. */
export const apiPageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ next: z.boolean(), previous: z.boolean(), elements: z.number(), pages: z.number(), current: z.number(), results: z.array(item) })

export function toPage<A, T>(
  api: { results: A[]; current: number; pages: number; elements: number; next: boolean; previous: boolean },
  map: (item: A) => T,
): Page<T> {
  return {
    results: api.results.map(map),
    current: api.current,
    pages: api.pages,
    elements: api.elements,
    hasNext: api.next,
    hasPrevious: api.previous,
  }
}
