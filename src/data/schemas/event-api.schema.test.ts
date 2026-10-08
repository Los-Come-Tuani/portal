import { describe, expect, it } from 'vitest'
import type { EventInput } from '../models'
import { apiEventPageSchema, apiEventSchema, eventBody, toEvent, toEventPage } from './event-api.schema'
import { cloneDatesSchema, eventInputSchema } from './event.schema'

const CITY = { id: '0193-leon', code: 'leon', name: 'León' }

const apiEvent = {
  id: '0196-marimba',
  name: 'Noche de marimba',
  description: 'Marimba en vivo en el parque central.',
  category: { code: 'musica', label: 'Música' },
  city: CITY,
  venue: 'Parque Central',
  address: 'Frente a la Catedral',
  latitude: 12.4343,
  longitude: -86.878,
  start_date: '2026-10-10',
  end_date: '2026-10-11',
  start_time: '18:00',
  end_time: '01:00',
  entry_price: 100,
  featured: false,
  status: 'scheduled',
  cancellation_reason: '',
  organizer: { kind: 'municipality', id: '0193-alcaldia', name: 'Alcaldía de León' },
  point_id: null,
  images: [{ key: 'event-photo/0196.jpg', url: 'https://cdn.example.com/event-photo/0196.jpg' }],
  cloned_from_id: null,
  created_at: '2026-10-01T15:00:00Z',
  hidden: true,
  hidden_reason: 'Información falsa',
}

const input: EventInput = {
  cityId: CITY.id,
  category: 'musica',
  name: '  Noche de marimba ',
  description: 'Marimba en vivo. ',
  venue: 'Parque Central',
  address: '',
  location: { latitude: 12.4343, longitude: -86.878 },
  startDate: '2026-10-10',
  endDate: '2026-10-10',
  startTime: '18:00',
  endTime: '21:00',
  entryPrice: 0,
  pointId: null,
  images: [{ key: 'event-photo/0196.jpg', url: null }],
  featured: true,
}

describe('un evento del API', () => {
  it('pasa al portal con las horas como la app y lo que puso el equipo', () => {
    const event = toEvent(apiEventSchema.parse(apiEvent))
    expect(event).toMatchObject({
      name: 'Noche de marimba',
      category: { code: 'musica', label: 'Música' },
      cityId: CITY.id,
      city: 'León',
      location: { latitude: 12.4343, longitude: -86.878 },
      startDate: '2026-10-10',
      endDate: '2026-10-11',
      startTime: '6:00 p.m.',
      endTime: '1:00 a.m.',
      entryPrice: 100,
      status: 'scheduled',
      organizer: { kind: 'municipality', name: 'Alcaldía de León' },
      hidden: true,
      hiddenReason: 'Información falsa',
    })
  })

  it('acepta un especial de K\'Plan sin organizador y la página del portal', () => {
    const page = toEventPage(
      apiEventPageSchema.parse({
        next: false,
        previous: false,
        elements: 1,
        pages: 1,
        current: 1,
        results: [{ ...apiEvent, organizer: { kind: 'kplan', id: null, name: "K'Plan" }, status: 'cancelled', cancellation_reason: 'Lluvia' }],
      }),
    )
    expect(page.results[0]).toMatchObject({ organizer: { kind: 'kplan', id: null }, status: 'cancelled', cancellationReason: 'Lluvia' })
    expect(page.hasNext).toBe(false)
  })

  it('rechaza un estado que el portal no conoce', () => {
    expect(apiEventSchema.safeParse({ ...apiEvent, status: 'published' }).success).toBe(false)
  })
})

describe('el cuerpo que se manda', () => {
  it('al programarlo lleva la ciudad y las claves de las fotos', () => {
    const body = eventBody(input, { create: true, moderator: false })
    expect(body).toMatchObject({ city_id: CITY.id, name: 'Noche de marimba', description: 'Marimba en vivo.', images: ['event-photo/0196.jpg'], point_id: null })
    expect(body).not.toHaveProperty('featured')
  })

  it('al corregirlo no manda la ciudad; destacar sólo lo manda el equipo', () => {
    const body = eventBody(input, { create: false, moderator: true })
    expect(body).not.toHaveProperty('city_id')
    expect(body).toMatchObject({ featured: true, start_time: '18:00', end_time: '21:00' })
  })
})

describe('las reglas del formulario', () => {
  const today = '2026-10-08'

  it('pide que empiece hoy o después, salvo que se corrija sin mover el inicio', () => {
    const past = { ...input, startDate: '2026-10-01', endDate: '2026-10-09' }
    expect(eventInputSchema({ today, originalStart: null }).safeParse(past).success).toBe(false)
    expect(eventInputSchema({ today, originalStart: '2026-10-01' }).safeParse(past).success).toBe(true)
  })

  it('no termina antes de empezar ni cierra a la misma hora; de madrugada sí', () => {
    const schema = eventInputSchema({ today, originalStart: null })
    expect(schema.safeParse({ ...input, endDate: '2026-10-09' }).error?.issues[0].path).toEqual(['endDate'])
    expect(schema.safeParse({ ...input, endTime: '18:00' }).error?.issues[0].path).toEqual(['endTime'])
    expect(schema.safeParse({ ...input, startTime: '22:00', endTime: '02:00' }).success).toBe(true)
  })

  it('clonar pide fechas nuevas válidas', () => {
    expect(cloneDatesSchema(today).safeParse({ startDate: '2026-10-07', endDate: '2026-10-07' }).success).toBe(false)
    expect(cloneDatesSchema(today).safeParse({ startDate: '2026-10-15', endDate: '2026-10-16' }).success).toBe(true)
  })
})
