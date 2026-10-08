import { z } from 'zod'
import { nowLocalDateTime, todayISO } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import type { MockDatabase } from '../db'
import { fail, paginate, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'
import { editableEvent, EVENT_CATEGORIES, eventId, eventOrganizer, eventStatus, visibleEvent, visibleEvents, wireEvent, type MockEvent } from '../services/agenda'
import { CITIES } from '../services/application-catalog'
import { checkPhotos, isActive, wireCity } from '../services/places'

const clock = z.string().regex(/^\d{2}:\d{2}$/, { error: 'Usa el formato HH:MM.' })
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Usa el formato AAAA-MM-DD.' })

/** El cuerpo de `POST cultural-event/`, con los límites del API. */
const eventBody = z.object({
  city_id: z.string().min(1),
  category: z.string().min(1).max(40),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).default(''),
  venue: z.string().trim().min(2).max(150),
  address: z.string().trim().max(200).default(''),
  latitude: z.number().min(10.7).max(15.1),
  longitude: z.number().min(-87.7).max(-82.6),
  start_date: date,
  end_date: date,
  start_time: clock,
  end_time: clock,
  entry_price: z.number().int().min(0).max(100_000).default(0),
  point_id: z.string().nullable().default(null),
  images: z.array(z.string().min(1)).max(8).default([]),
  featured: z.boolean().default(false),
})

/** `PATCH` aplica sólo lo que llega y no cambia la ciudad. */
const eventPatch = eventBody.omit({ city_id: true }).partial()

const invalid = (field: string, message: string) => fail.invalid('Revisa los campos marcados', { [field]: message })

function cityName(db: MockDatabase, cityId: string): string {
  const known = CITIES.find((city) => city.id === cityId)?.name ?? db.stops.map((stop) => stop.city).find((name) => wireCity(name).id === cityId)
  if (!known) throw invalid('city_id', 'Esa ciudad no existe.')
  return known
}

function checkCategory(code: string): void {
  if (!EVENT_CATEGORIES.some((item) => item.code === code)) throw invalid('category', 'Esa clase de evento no existe.')
}

function checkPoint(db: MockDatabase, pointId: string | null, city: string): void {
  if (pointId === null) return
  const stop = db.stops.find((item) => item.id === pointId)
  if (!stop || !isActive(stop) || stop.city !== city) throw invalid('point_id', 'Ese lugar no existe o es de otra ciudad.')
}

function checkDates(start: string, end: string, { changed = true } = {}): void {
  if (changed && start < todayISO()) throw invalid('start_date', 'El evento tiene que empezar hoy o después.')
  if (end < start) throw invalid('end_date', 'El evento no puede terminar antes de empezar.')
}

function checkTimes(start: string, end: string): void {
  if (start === end) throw invalid('end_time', 'La hora de cierre tiene que ser otra.')
}

const moderates = (context: MockContext) => hasPermission(context.db, requireUser(context), ['content.moderate'])

export const eventRoutes = [
  route('GET', endpoints.catalog.eventCategories, () => EVENT_CATEGORIES.map((item) => ({ id: item.code, ...item })), { isPublic: true }),

  route('GET', endpoints.culturalEvent.list, (context) => {
    const { db, query } = context
    const status = query.get('status')
    const cityId = query.get('city_id')
    const category = query.get('category')
    const from = query.get('from_date')
    const to = query.get('to_date')
    const search = query.get('search')?.trim().toLowerCase() ?? ''
    const organizerId = query.get('organizer_id')
    const shown = visibleEvents(db, requireUser(context))
      .filter((event) => !organizerId || event.organizerId === organizerId)
      .filter((event) => !status || eventStatus(event) === status)
      .filter((event) => !cityId || wireCity(event.city).id === cityId)
      .filter((event) => !category || event.category === category)
      .filter((event) => !from || event.endDate >= from)
      .filter((event) => !to || event.startDate <= to)
      .filter((event) => !search || event.name.toLowerCase().includes(search))
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id))
      .map((event) => wireEvent(db, event))
    return paginate(shown, query)
  }),

  route('POST', endpoints.culturalEvent.list, (context) => {
    const { db, body } = context
    const user = requireUser(context)
    const input = parseBody(eventBody, body)
    const organizer = eventOrganizer(db, user)
    if (!organizer && !moderates(context)) throw fail.forbidden()
    const city = cityName(db, input.city_id)
    checkCategory(input.category)
    checkPoint(db, input.point_id, city)
    checkDates(input.start_date, input.end_date)
    checkTimes(input.start_time, input.end_time)
    if (input.featured && !moderates(context)) throw invalid('featured', 'Destacar un evento lo decide el equipo.')
    const images = checkPhotos(db, input.images, [], 'images')
    const event: MockEvent = {
      id: eventId(db, input.name, input.start_date),
      name: input.name,
      description: input.description,
      category: input.category,
      city,
      venue: input.venue,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      startDate: input.start_date,
      endDate: input.end_date,
      startTime: input.start_time,
      endTime: input.end_time,
      entryPrice: input.entry_price,
      featured: input.featured,
      cancelled: false,
      cancellationReason: '',
      // Una alcaldía programa lo suyo; el equipo, los especiales de K'Plan.
      organizerId: organizer?.id ?? null,
      pointId: input.point_id,
      images,
      clonedFromId: null,
      createdAt: nowLocalDateTime(),
      hiddenAt: null,
      hiddenReason: '',
    }
    db.agenda.push(event)
    return wireEvent(db, event)
  }),

  route('GET', endpoints.culturalEvent.detail(':id'), (context) => wireEvent(context.db, visibleEvent(context.db, requireUser(context), context.params.id))),

  route('PATCH', endpoints.culturalEvent.detail(':id'), (context) => {
    const { db, body, params } = context
    const event = editableEvent(db, requireUser(context), params.id)
    const input = parseBody(eventPatch, body)
    if (input.featured !== undefined && input.featured !== event.featured && !moderates(context)) {
      throw invalid('featured', 'Destacar un evento lo decide el equipo.')
    }
    const start = input.start_date ?? event.startDate
    checkDates(start, input.end_date ?? event.endDate, { changed: start !== event.startDate })
    checkTimes(input.start_time ?? event.startTime, input.end_time ?? event.endTime)
    if (input.category !== undefined) checkCategory(input.category)
    if (input.point_id !== undefined) checkPoint(db, input.point_id, event.city)
    const images = input.images === undefined ? event.images : checkPhotos(db, input.images, event.images, 'images')
    Object.assign(event, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.venue !== undefined ? { venue: input.venue } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.entry_price !== undefined ? { entryPrice: input.entry_price } : {}),
      ...(input.point_id !== undefined ? { pointId: input.point_id } : {}),
      ...(input.featured !== undefined ? { featured: input.featured } : {}),
      startDate: start,
      endDate: input.end_date ?? event.endDate,
      startTime: input.start_time ?? event.startTime,
      endTime: input.end_time ?? event.endTime,
      images,
    })
    return wireEvent(db, event)
  }),

  route('POST', endpoints.culturalEvent.cancel(':id'), (context) => {
    const event = editableEvent(context.db, requireUser(context), context.params.id)
    const { reason } = parseBody(z.object({ reason: z.string().max(500).default('') }), context.body ?? {})
    event.cancelled = true
    event.cancellationReason = reason.trim()
    return wireEvent(context.db, event)
  }),

  route('POST', endpoints.culturalEvent.clone(':id'), (context) => {
    const { db } = context
    const user = requireUser(context)
    const original = visibleEvent(db, user, context.params.id)
    if (!moderates(context) && !eventOrganizer(db, user)) throw fail.forbidden()
    const dates = parseBody(z.object({ start_date: date, end_date: date }), context.body)
    checkDates(dates.start_date, dates.end_date)
    const clone: MockEvent = {
      ...structuredClone(original),
      id: eventId(db, original.name, dates.start_date),
      startDate: dates.start_date,
      endDate: dates.end_date,
      featured: false,
      cancelled: false,
      cancellationReason: '',
      clonedFromId: original.id,
      createdAt: nowLocalDateTime(),
      hiddenAt: null,
      hiddenReason: '',
    }
    db.agenda.push(clone)
    return wireEvent(db, clone)
  }),

  route(
    'POST',
    endpoints.culturalEvent.hide(':id'),
    (context) => {
      const event = visibleEvent(context.db, requireUser(context), context.params.id)
      const { reason } = parseBody(z.object({ reason: z.string().trim().min(3).max(500) }), context.body)
      event.hiddenAt = nowLocalDateTime()
      event.hiddenReason = reason
      return wireEvent(context.db, event)
    },
    { permissions: ['content.moderate'] },
  ),

  route(
    'POST',
    endpoints.culturalEvent.show(':id'),
    (context) => {
      const event = visibleEvent(context.db, requireUser(context), context.params.id)
      event.hiddenAt = null
      event.hiddenReason = ''
      return wireEvent(context.db, event)
    },
    { permissions: ['content.moderate'] },
  ),
]
