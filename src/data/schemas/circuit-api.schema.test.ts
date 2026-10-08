import { describe, expect, it } from 'vitest'
import { ApiError, renameFieldErrors } from '../api/errors'
import type { CircuitInput } from '../models'
import {
  apiCircuitDetailSchema,
  apiCircuitPageSchema,
  apiCircuitSchema,
  apiDepartureSchema,
  CIRCUIT_FORM_FIELDS,
  circuitBody,
  toCircuit,
  toCircuitPage,
  toDeparture,
} from './circuit-api.schema'

const CITY = { id: '0194-leon', code: 'leon', name: 'León' }

const STOP = {
  id: '0194-catedral',
  name: 'Catedral de León',
  pillar: { code: 'historia', label: 'Historia' },
  city: CITY,
  address: 'Parque Central',
  description: 'La catedral más grande de Centroamérica.',
  tip: '',
  latitude: 12.4343,
  longitude: -86.878,
  opens_at: '08:00',
  closes_at: '17:30',
  visit_minutes: 90,
  has_badge: true,
  rating: 4.8,
  reviews_count: 210,
  images: [],
  owner: null,
}

const CIRCUIT = {
  id: '0195-centro',
  kind: 'creative',
  status: 'unpublished',
  city: CITY,
  municipality: { id: '0194-alcaldia', name: 'Alcaldía de León' },
  title: 'León colonial a pie',
  short_title: 'León colonial',
  subtitle: 'Iglesias y murales',
  description: 'Un recorrido por el centro.',
  category: 'culture',
  difficulty: 'moderate',
  travel_mode: 'walking',
  price_adult: 12,
  price_child: 6,
  recommendations: 'Lleva agua',
  includes: '',
  notes: '',
  meeting_point: 'Parque Central',
  meeting_latitude: 12.4345,
  meeting_longitude: -86.8779,
  start_times: ['08:30', '14:00'],
  bonus_badges: 3,
  booking_mode: 'group',
  available_from: null,
  available_until: null,
  version: 2,
  rating: 4.6,
  reviews_count: 12,
  images: [{ key: 'circuit-photo/0195.jpg', url: 'https://cdn.example.com/circuit-photo/0195.jpg' }],
  stop_ids: ['0194-catedral', '0194-recoleccion'],
  badges: 5,
  duration_minutes: 150,
  created_at: '2026-10-01T12:00:00Z',
  published_at: '2026-10-02T12:00:00Z',
}

const DETAIL = {
  ...CIRCUIT,
  // El API no promete el orden de la lista: manda `order`.
  stops: [
    { order: 2, point: { ...STOP, id: '0194-recoleccion', name: 'Iglesia La Recolección' }, directions: 'Sigue la calle Real', leg_minutes: 12 },
    { order: 1, point: STOP, directions: '', leg_minutes: null },
  ],
}

describe('un circuito del API', () => {
  it('de la lista pasa al portal con sus códigos y horas como los lee la app', () => {
    const circuit = toCircuit(apiCircuitSchema.parse(CIRCUIT))
    expect(circuit).toMatchObject({
      id: '0195-centro',
      kind: 'creative',
      status: 'unpublished',
      title: 'León colonial a pie',
      shortTitle: 'León colonial',
      category: 'Cultura',
      difficulty: 'Moderado',
      city: 'León',
      cityId: '0194-leon',
      cityCode: 'leon',
      organizer: { id: '0194-alcaldia', name: 'Alcaldía de León' },
      stopIds: ['0194-catedral', '0194-recoleccion'],
      startTimes: ['8:30 a.m.', '2:00 p.m.'],
      location: { latitude: 12.4345, longitude: -86.8779 },
      bonusBadges: 3,
      bookingMode: 'group',
      images: CIRCUIT.images,
      version: 2,
    })
    // Las insignias de las paradas se muestran aparte de las extra.
    expect(circuit.badges).toBe(2)
    expect(circuit.duration).toBe('2 h 30 min')
    expect(circuit.stops).toBeUndefined()
    expect(circuit.availableFrom).toBeUndefined()
  })

  it('con su detalle ordena las paradas y guarda los traslados y las indicaciones por parada', () => {
    const circuit = toCircuit(apiCircuitDetailSchema.parse(DETAIL))
    expect(circuit.stopIds).toEqual(['0194-catedral', '0194-recoleccion'])
    expect(circuit.stops?.map((stop) => stop.name)).toEqual(['Catedral de León', 'Iglesia La Recolección'])
    expect(circuit.legMinutes).toEqual({ '0194-recoleccion': 12 })
    expect(circuit.directions).toEqual({ '0194-recoleccion': 'Sigue la calle Real' })
  })

  it('un especial con temporada la conserva', () => {
    const circuit = toCircuit(
      apiCircuitSchema.parse({ ...CIRCUIT, kind: 'kplan', bonus_badges: 2, available_from: '2026-12-01', available_until: '2027-01-15' }),
    )
    expect(circuit).toMatchObject({ kind: 'kplan', bonusBadges: 2, availableFrom: '2026-12-01', availableUntil: '2027-01-15', badges: 3 })
  })

  it('una página sigue la forma de las demás listas', () => {
    const page = toCircuitPage(apiCircuitPageSchema.parse({ next: true, previous: false, elements: 41, pages: 3, current: 1, results: [CIRCUIT] }))
    expect(page).toMatchObject({ current: 1, pages: 3, elements: 41, hasNext: true, hasPrevious: false })
    expect(page.results).toHaveLength(1)
  })

  it('rechaza una categoría que el API no conoce', () => {
    expect(apiCircuitSchema.safeParse({ ...CIRCUIT, category: 'Ciudad' }).success).toBe(false)
  })
})

const INPUT: CircuitInput = {
  kind: 'kplan',
  cityId: '0194-leon',
  title: '  León colonial a pie ',
  shortTitle: 'León colonial',
  subtitle: 'Iglesias y murales',
  category: 'Naturaleza',
  difficulty: 'Fácil',
  stopIds: ['0194-catedral', '0194-recoleccion'],
  travelMode: 'vehicle',
  legMinutes: { '0194-catedral': 30, '0194-recoleccion': 12 },
  directions: { '0194-recoleccion': 'Sigue la calle Real' },
  startTimes: ['8:30 a.m.', '2:00 p.m.'],
  priceAdult: 12,
  priceChild: 6,
  description: 'Un recorrido por el centro.',
  images: [{ key: 'circuit-photo/0195.jpg', url: 'https://cdn.example.com/circuit-photo/0195.jpg' }],
  recommendations: '',
  meetingPoint: 'Parque Central',
  location: { latitude: 12.4345, longitude: -86.8779 },
  includes: '',
  notes: '',
  bonusBadges: 2,
  bookingMode: 'private',
  availableFrom: '2026-12-01',
  availableUntil: '2027-01-15',
  draft: false,
}

describe('el circuito que se guarda', () => {
  it('va con códigos, horas "HH:MM", las fotos por su clave y las paradas en orden', () => {
    expect(circuitBody(INPUT)).toEqual({
      kind: 'kplan',
      city_id: '0194-leon',
      title: 'León colonial a pie',
      short_title: 'León colonial',
      subtitle: 'Iglesias y murales',
      description: 'Un recorrido por el centro.',
      category: 'nature',
      difficulty: 'easy',
      travel_mode: 'vehicle',
      price_adult: 12,
      price_child: 6,
      recommendations: '',
      includes: '',
      notes: '',
      meeting_point: 'Parque Central',
      meeting_latitude: 12.4345,
      meeting_longitude: -86.8779,
      start_times: ['08:30', '14:00'],
      bonus_badges: 2,
      booking_mode: 'private',
      available_from: '2026-12-01',
      available_until: '2027-01-15',
      images: ['circuit-photo/0195.jpg'],
      stops: [
        // La primera parada no tiene traslado aunque quede uno guardado de antes.
        { point_id: '0194-catedral', directions: '', leg_minutes: null },
        { point_id: '0194-recoleccion', directions: 'Sigue la calle Real', leg_minutes: 12 },
      ],
      status: 'published',
    })
  })

  it('un creativo sin ciudad deja que el API lo ponga en la de la alcaldía, en grupo y sin temporada', () => {
    const body = circuitBody({ ...INPUT, kind: 'creative', cityId: '', draft: true })
    expect(body).not.toHaveProperty('city_id')
    expect(body).toMatchObject({ kind: 'creative', bonus_badges: 3, booking_mode: 'group', available_from: null, available_until: null, status: 'draft' })
  })

  it('un privado no da insignias extra', () => {
    expect(circuitBody({ ...INPUT, kind: 'private' })).toMatchObject({ bonus_badges: 0, booking_mode: 'private', available_from: null })
  })

  it('los errores del API caen en los campos del formulario', () => {
    const error = renameFieldErrors(
      new ApiError(400, 'Revisa los campos', {
        'stops.1.point_id': 'Ese lugar no está en la ciudad.',
        meetingLatitude: 'Fuera de rango.',
        status: 'Para publicarlo, agrega una foto.',
        shortTitle: 'Muy largo.',
      }),
      CIRCUIT_FORM_FIELDS,
    )
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).fieldErrors).toEqual({
      stopIds: 'Ese lugar no está en la ciudad.',
      location: 'Fuera de rango.',
      draft: 'Para publicarlo, agrega una foto.',
      shortTitle: 'Muy largo.',
    })
  })
})

describe('una salida de guía', () => {
  it('pasa con la hora como la lee la app y el nombre del guía', () => {
    const departure = toDeparture(
      apiDepartureSchema.parse({
        id: '0196-salida',
        circuit: { id: '0195-centro', title: 'León colonial a pie', kind: 'creative', city: CITY },
        guide: { id: '0193-guia', name: 'Ana Pérez', photo: null },
        date: '2026-10-10',
        start_time: '08:30:00',
        capacity: 10,
        booked: 4,
        remaining: 6,
        exclusive: false,
        transport_included: true,
        note: 'Salimos puntuales',
        cancelled: false,
        price_adult: 12,
        price_child: 6,
      }),
    )
    expect(departure).toEqual({
      id: '0196-salida',
      circuitId: '0195-centro',
      date: '2026-10-10',
      startTime: '8:30 a.m.',
      capacity: 10,
      booked: 4,
      remaining: 6,
      exclusive: false,
      guideName: 'Ana Pérez',
      transportIncluded: true,
      note: 'Salimos puntuales',
      cancelled: false,
    })
  })

  it('conserva las canceladas para el portal', () => {
    const departure = toDeparture(
      apiDepartureSchema.parse({
        id: '0196-cancelada',
        circuit: { id: '0195-centro', title: 'León colonial a pie', kind: 'creative', city: CITY },
        guide: { id: '0193-guia', name: 'Ana Pérez', photo: null },
        date: '2026-10-11',
        start_time: '14:00',
        capacity: 8,
        booked: 0,
        remaining: 8,
        exclusive: false,
        transport_included: false,
        note: '',
        cancelled: true,
        price_adult: 12,
        price_child: 6,
      }),
    )
    expect(departure.cancelled).toBe(true)
    expect(departure.startTime).toBe('2:00 p.m.')
  })
})
