import { z } from 'zod'
import type { Page, Report, ReviewDispute, Sanction, SanctionInput } from '../models'
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

/** Los reportes y las sanciones como los habla el API (`report/` y `sanction/`, docs/avisos.md). */
const targetKind = z.enum(['user', 'review', 'place', 'event'])

export const apiReportReasonSchema = z.object({ code: z.string(), label: z.string(), requires_text: z.boolean() })

export const apiReportSchema = z.object({
  id: z.string(),
  target: z.object({ kind: targetKind, id: z.string().nullable(), label: z.string() }),
  reason: apiReportReasonSchema,
  note: z.string(),
  reporter: z.string(),
  status: z.enum(['pending', 'handled', 'dismissed']),
  created_at: z.string(),
  resolved_at: z.string().nullable(),
  resolution_note: z.string(),
})

export const apiReportPageSchema = apiPageSchema(apiReportSchema)

export const apiSanctionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  kind: z.enum(['warning', 'suspension', 'expulsion']),
  reason: z.string(),
  starts_at: z.string(),
  ends_at: z.string().nullable(),
  created_by: z.string(),
  report_id: z.string().nullable(),
  lifted_at: z.string().nullable(),
  active: z.boolean(),
})

export const apiSanctionPageSchema = apiPageSchema(apiSanctionSchema)

const local = (value: string | null) => (value ? toLocalDateTime(value) : null)

export function toReport(api: z.infer<typeof apiReportSchema>): Report {
  return {
    id: api.id,
    target: api.target,
    reason: { code: api.reason.code, label: api.reason.label, requiresText: api.reason.requires_text },
    note: api.note,
    reporter: api.reporter,
    status: api.status,
    createdAt: toLocalDateTime(api.created_at),
    resolvedAt: local(api.resolved_at),
    resolutionNote: api.resolution_note,
  }
}

export const toReportPage = (api: z.infer<typeof apiReportPageSchema>): Page<Report> => toPage(api, toReport)

export function toSanction(api: z.infer<typeof apiSanctionSchema>): Sanction {
  return {
    id: api.id,
    userId: api.user_id,
    userName: api.user_name,
    kind: api.kind,
    reason: api.reason,
    startsAt: toLocalDateTime(api.starts_at),
    endsAt: local(api.ends_at),
    createdBy: api.created_by,
    reportId: api.report_id,
    liftedAt: local(api.lifted_at),
    active: api.active,
  }
}

export const toSanctionPage = (api: z.infer<typeof apiSanctionPageSchema>): Page<Sanction> => toPage(api, toSanction)

/** `POST sanction/`: los días sólo van en una suspensión. */
export function sanctionBody(input: SanctionInput) {
  return {
    user_id: input.userId,
    kind: input.kind,
    reason: input.reason.trim(),
    ...(input.kind === 'suspension' && input.days ? { days: input.days } : {}),
    ...(input.reportId ? { report_id: input.reportId } : {}),
  }
}
