import { z } from 'zod'
import { inputToClock } from '@/lib/time'
import type { CulturalEvent, EventCategory, EventInput, Page } from '../models'
import { apiCitySchema, apiImageSchema, apiOptionSchema, apiPageSchema, toPage } from './api-common'

/**
 * Los eventos de la agenda como los habla el API (`cultural-event/`, docs/agenda-y-recompensas.md del
 * repo del API): `snake_case`, fechas `AAAA-MM-DD`, horas `"HH:MM"` y las fotos por su clave.
 */

export const apiEventCategorySchema = apiOptionSchema.extend({ id: z.string().optional() })

/** Un evento del portal (`GET cultural-event/`): trae si lo ocultó el equipo y por qué. */
export const apiEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: apiOptionSchema,
  city: apiCitySchema,
  venue: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  entry_price: z.number(),
  featured: z.boolean(),
  status: z.enum(['scheduled', 'ongoing', 'finished', 'cancelled']),
  cancellation_reason: z.string(),
  organizer: z.object({ kind: z.enum(['institution', 'municipality', 'kplan']), id: z.string().nullable(), name: z.string() }),
  point_id: z.string().nullable(),
  images: z.array(apiImageSchema),
  cloned_from_id: z.string().nullable(),
  created_at: z.string(),
  hidden: z.boolean(),
  hidden_reason: z.string(),
})

export const apiEventPageSchema = apiPageSchema(apiEventSchema)

/** Los campos del API que en el formulario se llaman distinto (`body.start_date` ya llega como `startDate`). */
export const EVENT_FORM_FIELDS = {
  latitude: 'location',
  longitude: 'location',
} as const

/** `"18:00"` → `"6:00 p.m."`. */
const toClock = (value: string) => inputToClock(value.slice(0, 5)) ?? value

export function toEventCategory(api: z.infer<typeof apiEventCategorySchema>): EventCategory {
  return { code: api.code, label: api.label }
}

export function toEvent(api: z.infer<typeof apiEventSchema>): CulturalEvent {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    category: { code: api.category.code, label: api.category.label },
    cityId: api.city.id,
    cityCode: api.city.code,
    city: api.city.name,
    venue: api.venue,
    address: api.address,
    location: { latitude: api.latitude, longitude: api.longitude },
    startDate: api.start_date,
    endDate: api.end_date,
    startTime: toClock(api.start_time),
    endTime: toClock(api.end_time),
    entryPrice: api.entry_price,
    featured: api.featured,
    status: api.status,
    cancellationReason: api.cancellation_reason,
    organizer: api.organizer,
    pointId: api.point_id,
    images: api.images,
    clonedFromId: api.cloned_from_id,
    createdAt: api.created_at,
    hidden: api.hidden,
    hiddenReason: api.hidden_reason,
  }
}

export const toEventPage = (api: z.infer<typeof apiEventPageSchema>): Page<CulturalEvent> => toPage(api, toEvent)

/**
 * El cuerpo de `POST` y `PATCH cultural-event/`. La ciudad sólo se elige al programarlo (`PATCH` no la
 * cambia) y `featured` sólo lo manda el equipo: a otro le respondería `400`.
 */
export function eventBody(input: EventInput, { create, moderator }: { create: boolean; moderator: boolean }) {
  return {
    ...(create ? { city_id: input.cityId } : {}),
    category: input.category,
    name: input.name.trim(),
    description: input.description.trim(),
    venue: input.venue.trim(),
    address: input.address.trim(),
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    start_date: input.startDate,
    end_date: input.endDate,
    start_time: input.startTime,
    end_time: input.endTime,
    entry_price: input.entryPrice,
    point_id: input.pointId,
    images: input.images.map((photo) => photo.key),
    ...(moderator ? { featured: input.featured } : {}),
  }
}
