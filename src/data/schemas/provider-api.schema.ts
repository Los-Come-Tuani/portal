import { z } from 'zod'
import type {
  Credential,
  Page,
  ProviderHistoryItem,
  ProviderReasons,
  ProviderRequestDetail,
  ProviderRequestSummary,
  RejectionReason,
} from '../models'

/** Lo que habla el API en `/provider-request/` (docs/prestadores.md del repo del API): `snake_case`. */

const requestStatus = z.enum(['submitted', 'in_review', 'approved', 'rejected'])
const procedure = z.enum(['application', 'renewal'])
const person = z.object({ id: z.string(), name: z.string(), email: z.string() })
const reference = z.object({ code: z.string(), label: z.string() })
const city = z.object({ id: z.string(), code: z.string(), name: z.string() })

const credential = z.object({
  id: z.string(),
  type: reference,
  number: z.string(),
  issued_on: z.string(),
  expires_on: z.string().nullable(),
  file: z.object({ key: z.string(), url: z.string().nullable() }),
  status: z.enum(['uploaded', 'in_review', 'approved', 'rejected', 'expired', 'replaced']),
  review: z
    .object({ accepted: z.boolean(), reason: reference.nullable(), note: z.string(), reviewed_at: z.string() })
    .nullable(),
  uploaded_at: z.string(),
})

const inline = z.object({
  id: z.string(),
  procedure,
  status: requestStatus,
  stage: z.enum(['documents', 'decision']).nullable(),
  applicant: person,
  services: z.array(z.string()),
  city: city.nullable(),
  submitted_at: z.string(),
  resolved_at: z.string().nullable(),
  taken_by: person.nullable(),
  counts: z.object({ total: z.number(), accepted: z.number(), rejected: z.number(), pending: z.number() }),
})

const history = z.object({
  id: z.string(),
  procedure,
  status: requestStatus,
  submitted_at: z.string(),
  resolved_at: z.string().nullable(),
  reason: reference.nullable(),
  note: z.string(),
})

const detail = inline.extend({
  profile: z.object({
    id: z.string(),
    status: z.enum(['unaccredited', 'in_review', 'active', 'suspended']),
    phone: z.string(),
    presentation: z.string(),
    photo: z.object({ key: z.string(), url: z.string().nullable() }).nullable(),
    languages: z.array(z.object({ code: z.string(), label: z.string(), level: z.enum(['basic', 'intermediate', 'advanced', 'native']) })),
    carries_tourists: z.boolean(),
    created_at: z.string(),
    approved_at: z.string().nullable(),
  }),
  documents: z.array(credential.extend({ required: z.boolean(), in_this_request: z.boolean() })),
  missing: z.array(reference),
  resolution: z.object({ approved: z.boolean(), reason: reference.nullable(), note: z.string(), resolved_at: z.string() }).nullable(),
  history: z.array(history),
})

const reason = z.object({ code: z.string(), label: z.string(), requires_text: z.boolean() })

export const apiProviderQueueSchema = z.object({
  next: z.boolean(),
  previous: z.boolean(),
  elements: z.number(),
  pages: z.number(),
  current: z.number(),
  results: z.array(inline),
})
export const apiProviderDetailSchema = detail
export const apiProviderReasonsSchema = z.object({ document: z.array(reason), decision: z.array(reason) })

function toCredential(api: z.infer<typeof credential>): Credential {
  return {
    id: api.id,
    type: api.type,
    number: api.number,
    issuedOn: api.issued_on,
    expiresOn: api.expires_on,
    file: api.file,
    status: api.status,
    review: api.review && {
      accepted: api.review.accepted,
      reason: api.review.reason,
      note: api.review.note,
      reviewedAt: api.review.reviewed_at,
    },
    uploadedAt: api.uploaded_at,
  }
}

function toSummary(api: z.infer<typeof inline>): ProviderRequestSummary {
  return {
    id: api.id,
    procedure: api.procedure,
    status: api.status,
    stage: api.stage,
    applicant: api.applicant,
    services: api.services,
    city: api.city,
    submittedAt: api.submitted_at,
    resolvedAt: api.resolved_at,
    takenBy: api.taken_by,
    counts: api.counts,
  }
}

function toHistory(api: z.infer<typeof history>): ProviderHistoryItem {
  return {
    id: api.id,
    procedure: api.procedure,
    status: api.status,
    submittedAt: api.submitted_at,
    resolvedAt: api.resolved_at,
    reason: api.reason,
    note: api.note,
  }
}

export function toProviderPage(api: z.infer<typeof apiProviderQueueSchema>): Page<ProviderRequestSummary> {
  return {
    results: api.results.map(toSummary),
    current: api.current,
    pages: api.pages,
    elements: api.elements,
    hasNext: api.next,
    hasPrevious: api.previous,
  }
}

export function toProviderDetail(api: z.infer<typeof detail>): ProviderRequestDetail {
  return {
    ...toSummary(api),
    profile: {
      id: api.profile.id,
      status: api.profile.status,
      phone: api.profile.phone,
      presentation: api.profile.presentation,
      photoUrl: api.profile.photo?.url ?? null,
      languages: api.profile.languages,
      carriesTourists: api.profile.carries_tourists,
      createdAt: api.profile.created_at,
      approvedAt: api.profile.approved_at,
    },
    documents: api.documents.map((item) => ({ ...toCredential(item), required: item.required, inThisRequest: item.in_this_request })),
    missing: api.missing,
    resolution: api.resolution && {
      approved: api.resolution.approved,
      reason: api.resolution.reason,
      note: api.resolution.note,
      resolvedAt: api.resolution.resolved_at,
    },
    history: api.history.map(toHistory),
  }
}

const toReason = (item: z.infer<typeof reason>): RejectionReason => ({ code: item.code, label: item.label, requiresText: item.requires_text })

export function toProviderReasons(api: z.infer<typeof apiProviderReasonsSchema>): ProviderReasons {
  return { document: api.document.map(toReason), decision: api.decision.map(toReason) }
}
