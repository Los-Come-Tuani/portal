import { z } from 'zod'
import { normalizeHours, ORGANIZATION_KINDS } from '../models/application'
import type {
  BusinessDetail,
  InstitutionDetail,
  MunicipalityDetail,
  Page,
  RejectionReason,
  RequestDetail,
  RequestHistoryItem,
  RequestSummary,
} from '../models/verification'
import { toClock } from './application-api.schema'

/** Lo que habla el API en `/verification-request/`: `snake_case`, horas con segundos. */

const status = z.enum(['submitted', 'in_review', 'approved', 'rejected'])
const person = z.object({ id: z.string(), name: z.string(), email: z.string() })
const reference = z.object({ code: z.string(), label: z.string() })

const inline = z.object({
  id: z.string(),
  kind: z.enum(ORGANIZATION_KINDS),
  organization_id: z.string(),
  organization_name: z.string(),
  city: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  status,
  submitted_at: z.string(),
  resolved_at: z.string().nullable(),
  taken_by: person.nullable(),
})

const business = z.object({
  business_type: reference,
  ruc: z.string(),
  address: z.string(),
  phone: z.string(),
  alternate_phone: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  hours: z.array(z.object({ weekday: z.number(), closed: z.boolean(), opens: z.string().nullable(), closes: z.string().nullable() })),
  signature_dish: z.object({ name: z.string(), description: z.string(), reference_price: z.number(), currency: z.string() }).nullable(),
})

const institution = z.object({ institution_type: reference, contact_email: z.string(), phone: z.string() })
const municipality = z.object({ contact_email: z.string(), phone: z.string() })

const history = z.object({
  id: z.string(),
  status,
  submitted_at: z.string(),
  resolved_at: z.string().nullable(),
  reason: reference.nullable(),
  note: z.string(),
})

const detail = inline.extend({
  applicant: person.nullable(),
  business: business.nullable(),
  institution: institution.nullable(),
  municipality: municipality.nullable(),
  documents: z.array(z.object({ kind: z.enum(['legal_document', 'signature_dish_photo']), url: z.string().nullable() })),
  resolution: z
    .object({ approved: z.boolean(), reason: reference.nullable(), note: z.string(), resolved_at: z.string() })
    .nullable(),
  history: z.array(history),
})

const page = <Item extends z.ZodType>(item: Item) =>
  z.object({
    next: z.boolean(),
    previous: z.boolean(),
    elements: z.number(),
    pages: z.number(),
    current: z.number(),
    results: z.array(item),
  })

export const apiQueueSchema = page(inline)
export const apiDetailSchema = detail
export const apiReasonsSchema = z.array(z.object({ code: z.string(), label: z.string(), requires_text: z.boolean() }))

type ApiInline = z.infer<typeof inline>
type ApiDetail = z.infer<typeof detail>

function toSummary(api: ApiInline): RequestSummary {
  return {
    id: api.id,
    kind: api.kind,
    organizationId: api.organization_id,
    organizationName: api.organization_name,
    city: api.city,
    status: api.status,
    submittedAt: api.submitted_at,
    resolvedAt: api.resolved_at,
    takenBy: api.taken_by,
  }
}

export function toPage(api: z.infer<typeof apiQueueSchema>): Page<RequestSummary> {
  return {
    results: api.results.map(toSummary),
    current: api.current,
    pages: api.pages,
    elements: api.elements,
    hasNext: api.next,
    hasPrevious: api.previous,
  }
}

function toBusiness(api: z.infer<typeof business>): BusinessDetail {
  return {
    businessType: api.business_type,
    ruc: api.ruc,
    address: api.address,
    phone: api.phone,
    alternatePhone: api.alternate_phone,
    latitude: api.latitude,
    longitude: api.longitude,
    hours: normalizeHours(
      api.hours.map((row) => ({ weekday: row.weekday, closed: row.closed, opens: toClock(row.opens), closes: toClock(row.closes) })),
    ),
    signatureDish: api.signature_dish && {
      name: api.signature_dish.name,
      description: api.signature_dish.description,
      referencePrice: api.signature_dish.reference_price,
      currency: api.signature_dish.currency,
    },
  }
}

function toInstitution(api: z.infer<typeof institution>): InstitutionDetail {
  return { institutionType: api.institution_type, contactEmail: api.contact_email, phone: api.phone }
}

function toMunicipality(api: z.infer<typeof municipality>): MunicipalityDetail {
  return { contactEmail: api.contact_email, phone: api.phone }
}

function toHistory(api: z.infer<typeof history>): RequestHistoryItem {
  return { id: api.id, status: api.status, submittedAt: api.submitted_at, resolvedAt: api.resolved_at, reason: api.reason, note: api.note }
}

export function toDetail(api: ApiDetail): RequestDetail {
  return {
    ...toSummary(api),
    applicant: api.applicant,
    business: api.business && toBusiness(api.business),
    institution: api.institution && toInstitution(api.institution),
    municipality: api.municipality && toMunicipality(api.municipality),
    documents: api.documents,
    resolution: api.resolution && {
      approved: api.resolution.approved,
      reason: api.resolution.reason,
      note: api.resolution.note,
      resolvedAt: api.resolution.resolved_at,
    },
    history: api.history.map(toHistory),
  }
}

export function toReasons(api: z.infer<typeof apiReasonsSchema>): RejectionReason[] {
  return api.map((item) => ({ code: item.code, label: item.label, requiresText: item.requires_text }))
}
