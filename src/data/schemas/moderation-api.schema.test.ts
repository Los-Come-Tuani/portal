import { describe, expect, it } from 'vitest'
import { apiDisputePageSchema, apiDisputeSchema, toDispute, toDisputePage } from './moderation-api.schema'

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
