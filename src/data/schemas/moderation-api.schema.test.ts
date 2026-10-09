import { describe, expect, it } from 'vitest'
import { apiDisputePageSchema, apiDisputeSchema, apiReportSchema, apiSanctionSchema, sanctionBody, toDispute, toDisputePage, toReport, toSanction } from './moderation-api.schema'

describe('un reporte de la bandeja', () => {
  it('trae a qué apunta, el motivo y quién lo hizo', () => {
    const report = toReport(
      apiReportSchema.parse({
        id: 'r1',
        target: { kind: 'user', id: 'u1', label: 'Pedro' },
        reason: { code: 'otro', label: 'Otro', requires_text: true },
        note: 'Me escribió fuera del chat.',
        reporter: 'Ana',
        status: 'pending',
        created_at: '2026-10-07T15:00:00Z',
        resolved_at: null,
        resolution_note: '',
      }),
    )
    expect(report).toMatchObject({ target: { kind: 'user', id: 'u1', label: 'Pedro' }, reason: { requiresText: true }, reporter: 'Ana', resolvedAt: null })
  })

  it('una reseña borrada llega sin id', () => {
    expect(
      apiReportSchema.safeParse({
        id: 'r2',
        target: { kind: 'review', id: null, label: '' },
        reason: { code: 'acoso', label: 'Acoso', requires_text: false },
        note: '',
        reporter: 'Ana',
        status: 'dismissed',
        created_at: '2026-10-07T15:00:00Z',
        resolved_at: '2026-10-08T15:00:00Z',
        resolution_note: 'Ya no existe.',
      }).success,
    ).toBe(true)
  })
})

describe('una sanción', () => {
  it('pasa con su vigencia y sin fecha de fin si dura hasta que se levante', () => {
    const sanction = toSanction(
      apiSanctionSchema.parse({
        id: 's1',
        user_id: 'u1',
        user_name: 'Pedro',
        kind: 'suspension',
        reason: 'Acoso a turistas.',
        starts_at: '2026-10-07T15:00:00Z',
        ends_at: null,
        created_by: 'Equipo',
        report_id: 'r1',
        lifted_at: null,
        active: true,
      }),
    )
    expect(sanction).toMatchObject({ kind: 'suspension', endsAt: null, reportId: 'r1', active: true })
  })

  it('los días sólo viajan en una suspensión, y el reporte si lo hay', () => {
    expect(sanctionBody({ userId: 'u1', kind: 'suspension', reason: ' Acoso. ', days: 7, reportId: 'r1' })).toEqual({ user_id: 'u1', kind: 'suspension', reason: 'Acoso.', days: 7, report_id: 'r1' })
    expect(sanctionBody({ userId: 'u1', kind: 'warning', reason: 'Primera vez.', days: 7, reportId: null })).toEqual({ user_id: 'u1', kind: 'warning', reason: 'Primera vez.' })
  })
})

const apiDispute = {
  id: '0198-impugnacion',
  review: {
    id: '0198-resena',
    booking_id: '0198-reserva',
    direction: 'tourist_to_guide',
    rating: 1,
    comment: 'Nunca llegó.',
    created_at: '2026-10-05T23:00:00Z',
    hidden: false,
  },
  author: 'Ana',
  subject: 'Pedro',
  raised_by: 'Pedro',
  reason: 'Llegué a tiempo; tengo los mensajes.',
  status: 'pending',
  created_at: '2026-10-06T15:00:00Z',
  resolved_at: null,
  note: '',
}

describe('una reseña impugnada', () => {
  it('pasa al portal con quién la escribió, a quién y quién la impugnó', () => {
    expect(toDispute(apiDisputeSchema.parse(apiDispute))).toMatchObject({
      review: { direction: 'tourist_to_guide', rating: 1, comment: 'Nunca llegó.', createdAt: '2026-10-05T17:00:00.000', hidden: false },
      author: 'Ana',
      subject: 'Pedro',
      raisedBy: 'Pedro',
      status: 'pending',
      resolvedAt: null,
    })
  })

  it('una resuelta trae la fecha y la nota; la página dice si hay más', () => {
    const page = toDisputePage(
      apiDisputePageSchema.parse({
        next: true,
        previous: false,
        elements: 21,
        pages: 2,
        current: 1,
        results: [{ ...apiDispute, status: 'upheld', resolved_at: '2026-10-07T16:00:00Z', note: 'Ofensiva', review: { ...apiDispute.review, hidden: true } }],
      }),
    )
    expect(page).toMatchObject({ elements: 21, hasNext: true })
    expect(page.results[0]).toMatchObject({ status: 'upheld', note: 'Ofensiva', resolvedAt: '2026-10-07T10:00:00.000', review: { hidden: true } })
  })

  it('rechaza un estado que el portal no conoce', () => {
    expect(apiDisputeSchema.safeParse({ ...apiDispute, status: 'open' }).success).toBe(false)
  })
})
