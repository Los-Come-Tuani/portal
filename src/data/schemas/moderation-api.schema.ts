import { z } from 'zod'
import type { Page, ReviewDispute } from '../models'
import { apiPageSchema, toLocalDateTime, toPage } from './api-common'

/** Las reseñas impugnadas como las habla el API (`review-dispute/`, docs/servicios.md del repo del API). */
export const apiDisputeSchema = z.object({
  id: z.string(),
  review: z.object({
    id: z.string(),
    booking_id: z.string(),
    direction: z.enum(['tourist_to_guide', 'guide_to_tourist']),
    rating: z.number(),
    comment: z.string(),
    created_at: z.string(),
    hidden: z.boolean(),
  }),
  author: z.string(),
  subject: z.string(),
  raised_by: z.string(),
  reason: z.string(),
  status: z.enum(['pending', 'upheld', 'rejected']),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
  note: z.string(),
})

export const apiDisputePageSchema = apiPageSchema(apiDisputeSchema)

export function toDispute(api: z.infer<typeof apiDisputeSchema>): ReviewDispute {
  return {
    id: api.id,
    review: {
      id: api.review.id,
      bookingId: api.review.booking_id,
      direction: api.review.direction,
      rating: api.review.rating,
      comment: api.review.comment,
      createdAt: toLocalDateTime(api.review.created_at),
      hidden: api.review.hidden,
    },
    author: api.author,
    subject: api.subject,
    raisedBy: api.raised_by,
    reason: api.reason,
    status: api.status,
    createdAt: toLocalDateTime(api.created_at),
    resolvedAt: api.resolved_at ? toLocalDateTime(api.resolved_at) : null,
    note: api.note,
  }
}

export const toDisputePage = (api: z.infer<typeof apiDisputePageSchema>): Page<ReviewDispute> => toPage(api, toDispute)
