import { describe, expect, it } from 'vitest'
import {
  apiPlacePageSchema,
  apiPlaceSchema,
  apiPostSchema,
  apiProfileSchema,
  apiStopSchema,
  newPlaceBody,
  placeBody,
  postBody,
  profileBody,
  toPost,
  toProfile,
  toStop,
  toStopPage,
} from './place-api.schema'

const STOP = {
  id: '0194-catedral',
  name: 'Catedral de León',
  pillar: { code: 'historia', label: 'Historia' },
  city: { id: '0194-leon', code: 'leon', name: 'León' },
  address: 'Parque Central',
  description: 'La catedral más grande de Centroamérica.',
  tip: 'Sube a los techos',
  latitude: 12.4343,
  longitude: -86.878,
  opens_at: '08:00',
  closes_at: '17:30',
  visit_minutes: 90,
  has_badge: true,
  rating: 4.8,
  reviews_count: 210,
  images: [
    { key: 'https://picsum.photos/seed/catedral/900/600', url: 'https://picsum.photos/seed/catedral/900/600' },
    { key: 'place-photo/0194.jpg', url: null },
  ],
  owner: { kind: 'municipality', id: '0194-alcaldia', name: 'Alcaldía de León' },
}

const PLACE = { ...STOP, active: false, created_at: '2026-10-05T14:30:00Z', published_circuits: 2 }

describe('un lugar del API', () => {
  it('pasa al portal con la categoría, las horas y el tiempo de visita como los lee la app', () => {
    expect(toStop(apiPlaceSchema.parse(PLACE))).toEqual({
      id: '0194-catedral',
      name: 'Catedral de León',
      category: 'Historia',
      city: 'León',
      cityId: '0194-leon',
      address: 'Parque Central',
      opensAt: '8:00 a.m.',
      closesAt: '5:30 p.m.',
      duration: '1 h 30 min',
      rating: 4.8,
      reviewsCount: 210,
      hasBadge: true,
      description: 'La catedral más grande de Centroamérica.',
      tip: 'Sube a los techos',
      images: STOP.images,
      coordinates: { latitude: 12.4343, longitude: -86.878 },
      active: false,
      owner: { kind: 'municipality', id: '0194-alcaldia', name: 'Alcaldía de León' },
      publishedCircuits: 2,
    })
  })

  it('sin horario es un lugar que no cierra', () => {
    const stop = toStop(apiStopSchema.parse({ ...STOP, opens_at: null, closes_at: null }))
    expect(stop.opensAt).toBeUndefined()
    expect(stop.closesAt).toBeUndefined()
  })

  it('el de la ruta pública está en la app y sin circuitos contados', () => {
    expect(toStop(apiStopSchema.parse(STOP))).toMatchObject({ active: true, publishedCircuits: 0 })
  })

  it('un pilar que el portal no conoce se muestra como Cultura', () => {
    expect(toStop(apiStopSchema.parse({ ...STOP, pillar: { code: 'otro', label: 'Otro' } })).category).toBe('Cultura')
  })

  it('lee la página', () => {
    const result = toStopPage(apiPlacePageSchema.parse({ next: false, previous: true, elements: 26, pages: 2, current: 2, results: [PLACE] }))
    expect(result).toMatchObject({ current: 2, pages: 2, elements: 26, hasNext: false, hasPrevious: true })
    expect(result.results[0].id).toBe('0194-catedral')
  })
})

describe('lo que se manda de un lugar', () => {
  const input = {
    name: ' Catedral de León ',
    category: 'Gastronomía' as const,
    address: ' Parque Central ',
    opensAt: '8:00 a.m.',
    closesAt: '5:30 p.m.',
    duration: '1 h 30 min',
    description: ' Una descripción. ',
    tip: '',
    images: STOP.images,
    coordinates: { latitude: 12.4343, longitude: -86.878 },
  }

  it('va con el pilar, las horas en 24 horas, los minutos de visita y las fotos por su clave', () => {
    expect(placeBody(input)).toEqual({
      pillar: 'gastronomia',
      name: 'Catedral de León',
      address: 'Parque Central',
      description: 'Una descripción.',
      tip: '',
      latitude: 12.4343,
      longitude: -86.878,
      opens_at: '08:00',
      closes_at: '17:30',
      visit_minutes: 90,
      images: ['https://picsum.photos/seed/catedral/900/600', 'place-photo/0194.jpg'],
    })
  })

  it('sin horario manda las dos horas nulas', () => {
    expect(placeBody({ ...input, opensAt: undefined, closesAt: undefined })).toMatchObject({ opens_at: null, closes_at: null })
  })

  it('uno nuevo lleva la ciudad solo si la eligió el equipo', () => {
    const base = { name: 'Mirador', category: 'Naturaleza' as const, address: 'Cerro Negro', coordinates: { latitude: 12.5, longitude: -86.7 } }
    expect(newPlaceBody({ ...base, cityId: '0194-leon' })).toEqual({
      city_id: '0194-leon',
      pillar: 'naturaleza',
      name: 'Mirador',
      address: 'Cerro Negro',
      latitude: 12.5,
      longitude: -86.7,
    })
    expect(newPlaceBody({ ...base, cityId: null })).not.toHaveProperty('city_id')
  })
})

describe('la ficha', () => {
  const PROFILE = {
    offerings: [{ id: '0194-of', name: 'Vigorón', description: '', price: 120 }],
    amenities: ['card', 'algo-raro'],
    languages: ['Español'],
    contact: { phone: '+505 2311 0000', whatsapp: '', email: '', website: '', instagram: '', facebook: '' },
    updated_at: null,
  }

  it('se lee con el lugar al que pertenece y sin servicios desconocidos', () => {
    expect(toProfile('0194-catedral', apiProfileSchema.parse(PROFILE))).toEqual({
      stopId: '0194-catedral',
      offerings: [{ id: '0194-of', name: 'Vigorón', description: '', price: 120 }],
      amenities: ['card'],
      languages: ['Español'],
      contact: PROFILE.contact,
      updatedAt: null,
    })
  })

  it('se manda completa y las ofertas sin id', () => {
    const body = profileBody({
      offerings: [{ id: 'of-local', name: ' Indio viejo ', description: '', price: null }],
      amenities: ['wifi'],
      languages: ['Español', 'Inglés'],
      contact: { phone: '', whatsapp: ' +505 8888 8888 ', email: '', website: '', instagram: '', facebook: '' },
    })
    expect(body.offerings).toEqual([{ name: 'Indio viejo', description: '', price: null }])
    expect(body.contact.whatsapp).toBe('+505 8888 8888')
  })
})

describe('las novedades', () => {
  const POST = {
    id: '0194-post',
    place_id: '0194-catedral',
    title: 'Misa de gallo',
    body: 'Este sábado la catedral abre hasta la medianoche.',
    image: { key: 'place-photo/0194.jpg', url: null },
    visible: false,
    published_at: '2026-10-05T14:30:00Z',
  }

  it('una oculta se lee como tal, con su lugar y su foto', () => {
    expect(toPost(apiPostSchema.parse(POST))).toMatchObject({
      id: '0194-post',
      stopId: '0194-catedral',
      image: { key: 'place-photo/0194.jpg', url: null },
      status: 'hidden',
      publishedAt: expect.stringMatching(/^2026-10-05T/),
    })
  })

  it('crear lleva el lugar; corregir sin foto manda la clave nula', () => {
    const input = { stopId: '0194-catedral', title: ' Misa ', body: ' Texto ', image: { key: 'place-photo/0194.jpg', url: null }, status: 'published' as const }
    expect(postBody(input, 'create')).toEqual({ place_id: '0194-catedral', title: 'Misa', body: 'Texto', image_key: 'place-photo/0194.jpg', visible: true })
    expect(postBody({ ...input, image: null, status: 'hidden' }, 'update')).toEqual({ title: 'Misa', body: 'Texto', image_key: null, visible: false })
  })
})
