import { describe, expect, it } from 'vitest'
import { isDecidable } from '../models/verification'
import { apiDetailSchema, apiQueueSchema, apiReasonsSchema, toDetail, toPage, toReasons } from './verification-api.schema'

const PERSON = { id: 'u1', name: 'Luis Pérez', email: 'luis@example.com' }
const CITY = { id: 'c1', code: 'leon', name: 'León' }

/** Lo que responde `GET /verification-request/` (la bandeja). */
const QUEUE = {
  next: true,
  previous: false,
  elements: 41,
  pages: 3,
  current: 1,
  results: [
    {
      id: 'r1',
      kind: 'business',
      organization_id: 'o1',
      organization_name: 'El Sacuanjoche',
      city: CITY,
      status: 'submitted',
      submitted_at: '2026-10-05T14:30:00Z',
      resolved_at: null,
      taken_by: null,
    },
    {
      id: 'r2',
      kind: 'municipality',
      organization_id: 'o2',
      organization_name: 'Alcaldía de León',
      city: CITY,
      status: 'in_review',
      submitted_at: '2026-10-05T15:00:00Z',
      resolved_at: null,
      taken_by: { id: 'u9', name: 'Raquel Úbeda', email: 'raquel@example.com' },
    },
  ],
}

/** Lo que responde `GET /verification-request/{id}/` de un comercio rechazado antes. */
const DETAIL = {
  ...QUEUE.results[0],
  applicant: PERSON,
  business: {
    business_type: { code: 'restaurante', label: 'Restaurante' },
    ruc: 'J0310000000001',
    address: 'Frente a la catedral',
    phone: '2311-0000',
    alternate_phone: '',
    latitude: 12.4379,
    longitude: -86.878,
    hours: [
      { weekday: 1, closed: false, opens: '08:00:00', closes: '17:00:00' },
      { weekday: 0, closed: true, opens: null, closes: null },
    ],
    signature_dish: { name: 'Vigorón', description: '', reference_price: 120, currency: 'NIO' },
  },
  institution: null,
  municipality: null,
  documents: [{ kind: 'signature_dish_photo', url: 'https://storage.example/bucket/foto.jpg?expires=300' }],
  resolution: null,
  history: [
    {
      id: 'r0',
      status: 'rejected',
      submitted_at: '2026-10-04T10:00:00Z',
      resolved_at: '2026-10-04T12:00:00Z',
      reason: { code: 'ruc_invalido', label: 'El RUC no es válido' },
      note: 'Revisa el número.',
    },
  ],
}

describe('la bandeja del equipo', () => {
  it('lee la página y la lleva al modelo del portal', () => {
    const page = toPage(apiQueueSchema.parse(QUEUE))

    expect(page).toMatchObject({ current: 1, pages: 3, elements: 41, hasNext: true, hasPrevious: false })
    expect(page.results).toHaveLength(2)
    expect(page.results[0]).toEqual({
      id: 'r1',
      kind: 'business',
      organizationId: 'o1',
      organizationName: 'El Sacuanjoche',
      city: CITY,
      status: 'submitted',
      submittedAt: '2026-10-05T14:30:00Z',
      resolvedAt: null,
      takenBy: null,
    })
    expect(page.results[1].takenBy).toEqual({ id: 'u9', name: 'Raquel Úbeda', email: 'raquel@example.com' })
  })

  it('rechaza una página que no es lo que se espera', () => {
    expect(() => apiQueueSchema.parse({ ...QUEUE, results: [{ ...QUEUE.results[0], status: 'maybe' }] })).toThrow()
    expect(() => apiQueueSchema.parse({ results: [] })).toThrow()
  })
})

describe('el expediente', () => {
  it('lee el comercio con su horario sin segundos, de lunes a domingo, y el platillo', () => {
    const detail = toDetail(apiDetailSchema.parse(DETAIL))

    expect(detail.applicant).toEqual(PERSON)
    expect(detail.institution).toBeNull()
    expect(detail.business?.businessType).toEqual({ code: 'restaurante', label: 'Restaurante' })
    expect(detail.business?.hours.map((row) => row.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(detail.business?.hours[0]).toEqual({ weekday: 1, closed: false, opens: '08:00', closes: '17:00' })
    expect(detail.business?.hours.at(-1)).toEqual({ weekday: 0, closed: true, opens: '', closes: '' })
    expect(detail.business?.signatureDish).toEqual({ name: 'Vigorón', description: '', referencePrice: 120, currency: 'NIO' })
    expect(detail.documents).toEqual([{ kind: 'signature_dish_photo', url: 'https://storage.example/bucket/foto.jpg?expires=300' }])
  })

  it('trae los intentos anteriores con su motivo y su nota', () => {
    const detail = toDetail(apiDetailSchema.parse(DETAIL))

    expect(detail.history).toEqual([
      {
        id: 'r0',
        status: 'rejected',
        submittedAt: '2026-10-04T10:00:00Z',
        resolvedAt: '2026-10-04T12:00:00Z',
        reason: { code: 'ruc_invalido', label: 'El RUC no es válido' },
        note: 'Revisa el número.',
      },
    ])
  })

  it('lee una alcaldía resuelta con su decisión', () => {
    const detail = toDetail(
      apiDetailSchema.parse({
        ...QUEUE.results[1],
        status: 'approved',
        resolved_at: '2026-10-05T16:00:00Z',
        applicant: null,
        business: null,
        institution: null,
        municipality: { contact_email: 'alcaldia@example.com', phone: '2311-2222' },
        documents: [{ kind: 'legal_document', url: null }],
        resolution: { approved: true, reason: null, note: 'Bienvenida.', resolved_at: '2026-10-05T16:00:00Z' },
        history: [],
      }),
    )

    expect(detail.applicant).toBeNull()
    expect(detail.municipality).toEqual({ contactEmail: 'alcaldia@example.com', phone: '2311-2222' })
    expect(detail.resolution).toEqual({ approved: true, reason: null, note: 'Bienvenida.', resolvedAt: '2026-10-05T16:00:00Z' })
    expect(detail.documents[0].url).toBeNull()
  })

  it('solo se decide mientras está abierto', () => {
    expect(isDecidable({ status: 'submitted' })).toBe(true)
    expect(isDecidable({ status: 'in_review' })).toBe(true)
    expect(isDecidable({ status: 'approved' })).toBe(false)
    expect(isDecidable({ status: 'rejected' })).toBe(false)
  })
})

describe('los motivos para rechazar', () => {
  it('traen si exigen explicar', () => {
    const reasons = toReasons(
      apiReasonsSchema.parse([
        { code: 'documento_ilegible', label: 'El documento no se lee', requires_text: false },
        { code: 'otro', label: 'Otro motivo', requires_text: true },
      ]),
    )

    expect(reasons).toEqual([
      { code: 'documento_ilegible', label: 'El documento no se lee', requiresText: false },
      { code: 'otro', label: 'Otro motivo', requiresText: true },
    ])
  })
})
