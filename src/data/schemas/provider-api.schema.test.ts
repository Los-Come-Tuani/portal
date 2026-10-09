import { describe, expect, it } from 'vitest'
import { isReviewable } from '../models'
import { apiProviderDetailSchema, apiProviderQueueSchema, apiProviderReasonsSchema, toProviderDetail, toProviderPage, toProviderReasons } from './provider-api.schema'

const person = { id: 'u-1', name: 'Marlene Ríos', email: 'marlene@example.com' }

const inline = {
  id: 'req-2',
  procedure: 'application',
  status: 'in_review',
  stage: 'documents',
  applicant: person,
  services: ['guia'],
  city: null,
  submitted_at: '2026-10-07T15:00:00Z',
  resolved_at: null,
  taken_by: { id: 'u-9', name: 'Daniela', email: 'daniela@example.com' },
  counts: { total: 3, accepted: 2, rejected: 0, pending: 1 },
}

const document = (id: string, code: string, extra: object) => ({
  id,
  type: { code, label: code },
  number: '1',
  issued_on: '2024-01-10',
  expires_on: null,
  file: { key: `provider-document/${id}.jpg`, url: 'https://bucket/x' },
  uploaded_at: '2026-10-07T15:00:00Z',
  required: true,
  ...extra,
})

/** Lo que responde `GET /provider-request/{id}/` de un reenvío: la licencia nueva y lo aceptado antes. */
const detail = {
  ...inline,
  profile: {
    id: 'p-1',
    status: 'in_review',
    phone: '+505 8831 4476',
    presentation: 'Seis años en Granada.',
    photo: null,
    languages: [{ code: 'es', label: 'Español', level: 'native' }],
    carries_tourists: false,
    created_at: '2026-10-01T15:00:00Z',
    approved_at: null,
  },
  documents: [
    document('d-1', 'cedula', {
      status: 'uploaded',
      in_this_request: false,
      review: { accepted: true, reason: null, note: '', reviewed_at: '2026-10-02T15:00:00Z' },
    }),
    document('d-2', 'licencia_intur', { status: 'in_review', in_this_request: true, review: null }),
  ],
  missing: [],
  resolution: null,
  history: [
    {
      id: 'req-1',
      procedure: 'application',
      status: 'rejected',
      submitted_at: '2026-10-01T15:00:00Z',
      resolved_at: '2026-10-02T15:00:00Z',
      reason: { code: 'documentos_por_corregir', label: 'Hay documentos por corregir' },
      note: '',
    },
  ],
}

describe('la cola de guías y traductores', () => {
  it('lee la bandeja con sus páginas y la cuenta de documentos', () => {
    const page = toProviderPage(apiProviderQueueSchema.parse({ next: false, previous: false, elements: 1, pages: 1, current: 1, results: [inline] }))

    expect(page.elements).toBe(1)
    expect(page.results[0]).toMatchObject({
      procedure: 'application',
      stage: 'documents',
      submittedAt: '2026-10-07T15:00:00Z',
      takenBy: { name: 'Daniela' },
      counts: { accepted: 2, pending: 1 },
    })
  })

  it('lee el expediente con lo de este y lo que viene de uno anterior', () => {
    const request = toProviderDetail(apiProviderDetailSchema.parse(detail))

    expect(request.profile.carriesTourists).toBe(false)
    expect(request.profile.photoUrl).toBeNull()
    expect(request.documents.map((item) => [item.type.code, item.inThisRequest])).toEqual([
      ['cedula', false],
      ['licencia_intur', true],
    ])
    expect(request.documents[0].review).toMatchObject({ accepted: true, reviewedAt: '2026-10-02T15:00:00Z' })
    expect(request.history[0].reason?.code).toBe('documentos_por_corregir')
  })

  it('no deja volver a revisar lo aceptado en un expediente anterior', () => {
    const request = toProviderDetail(apiProviderDetailSchema.parse(detail))

    expect(isReviewable(request, request.documents[0])).toBe(false)
    expect(isReviewable(request, request.documents[1])).toBe(true)
    expect(isReviewable({ ...request, status: 'approved' }, request.documents[1])).toBe(false)
  })

  it('lee los motivos de cada lista', () => {
    const reasons = toProviderReasons(
      apiProviderReasonsSchema.parse({
        document: [{ code: 'otro', label: 'Otro motivo', requires_text: true }],
        decision: [{ code: 'antecedentes_no_favorables', label: 'Los antecedentes no son favorables', requires_text: false }],
      }),
    )

    expect(reasons.document[0]).toEqual({ code: 'otro', label: 'Otro motivo', requiresText: true })
    expect(reasons.decision).toHaveLength(1)
  })
})
