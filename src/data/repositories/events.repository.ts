import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { renameFieldErrors } from '../api/errors'
import { http } from '../api/http-client'
import type { CulturalEvent, EventInput, EventStatus } from '../models'
import { apiEventCategorySchema, apiEventPageSchema, apiEventSchema, EVENT_FORM_FIELDS, eventBody, toEvent, toEventCategory, toEventPage } from '../schemas/event-api.schema'
import { allPages } from './pages'

export interface EventFilters {
  status?: EventStatus
  /** Los que tienen algún día en el rango. */
  fromDate?: string
  toDate?: string
  cityId?: string
  search?: string
}

/** El evento que responde el API; un error por campo sale con el nombre del formulario. */
async function event(request: Promise<unknown>): Promise<CulturalEvent> {
  try {
    return toEvent(apiEventSchema.parse(await request))
  } catch (error) {
    throw renameFieldErrors(error, EVENT_FORM_FIELDS)
  }
}

/**
 * La agenda cultural del portal (docs/agenda-y-recompensas.md del repo del API). El equipo con
 * `content.moderate` ve todos; una institución o una alcaldía verificada, los suyos.
 */
export const eventsRepository = {
  /** Todos los que dejan ver los filtros, juntando las páginas: los de una organización son pocos. */
  list: (filters: EventFilters = {}) =>
    allPages(async (page, pageSize) =>
      toEventPage(
        apiEventPageSchema.parse(
          await http.get<unknown>(endpoints.culturalEvent.list, {
            query: {
              status: filters.status,
              from_date: filters.fromDate,
              to_date: filters.toDate,
              city_id: filters.cityId,
              search: filters.search,
              page,
              page_size: pageSize,
            },
          }),
        ),
      ),
    ),

  categories: async () => z.array(apiEventCategorySchema).parse(await http.get<unknown>(endpoints.catalog.eventCategories)).map(toEventCategory),

  create: (input: EventInput, moderator: boolean) =>
    event(http.post<unknown>(endpoints.culturalEvent.list, { body: eventBody(input, { create: true, moderator }) })),

  update: (eventId: string, input: EventInput, moderator: boolean) =>
    event(http.patch<unknown>(endpoints.culturalEvent.detail(eventId), { body: eventBody(input, { create: false, moderator }) })),

  /** Destacar en el inicio de la app es del equipo. */
  feature: (eventId: string, featured: boolean) => event(http.patch<unknown>(endpoints.culturalEvent.detail(eventId), { body: { featured } })),

  /** Sigue en la app, señalado como cancelado. */
  cancel: (eventId: string, reason: string) => event(http.post<unknown>(endpoints.culturalEvent.cancel(eventId), { body: { reason: reason.trim() } })),

  /** Copia todo lo demás con fechas nuevas: para lo que se repite. */
  clone: (eventId: string, dates: { startDate: string; endDate: string }) =>
    event(http.post<unknown>(endpoints.culturalEvent.clone(eventId), { body: { start_date: dates.startDate, end_date: dates.endDate } })),

  hide: (eventId: string, reason: string) => event(http.post<unknown>(endpoints.culturalEvent.hide(eventId), { body: { reason: reason.trim() } })),

  show: (eventId: string) => event(http.post<unknown>(endpoints.culturalEvent.show(eventId))),
}
