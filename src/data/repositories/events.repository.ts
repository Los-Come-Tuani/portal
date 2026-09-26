import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { EventInput, EventItem, EventStatus } from '../models'

export interface EventFilters {
  /** Id de la organización, o `"kplan"` para los eventos especiales de K'Plan. */
  organizerId?: string
  from?: string
  to?: string
}

export const eventsRepository = {
  list: (filters: EventFilters = {}) => http.get<EventItem[]>(endpoints.events.list, { query: { ...filters } }),
  get: (eventId: string) => http.get<EventItem>(endpoints.events.detail(eventId)),
  create: (input: EventInput) => http.post<EventItem>(endpoints.events.list, { body: input }),
  update: (eventId: string, input: EventInput) => http.put<EventItem>(endpoints.events.detail(eventId), { body: input }),
  remove: (eventId: string) => http.delete(endpoints.events.detail(eventId)),
  moderate: (eventId: string, changes: { status?: EventStatus; featured?: boolean }) =>
    http.patch<EventItem>(endpoints.events.moderation(eventId), { body: changes }),
}
