import { z } from 'zod'
import {
  fileNameOfKey,
  normalizeHours,
  ORGANIZATION_KINDS,
  type ApplicantInput,
  type DayHours,
  type MyApplication,
  type OrganizationData,
  type SignatureDish,
  type StoredFile,
} from '../models/application'
import { apiSessionUserSchema } from './session.schema'

/**
 * Lo que habla el API en las rutas de la solicitud (docs/organizaciones.md del repo del API):
 * `snake_case`, horas con segundos y precios como número. Aquí se lee con Zod y se traduce al
 * modelo del portal, y al revés al mandar un formulario.
 */

// ── Lo que devuelve el API ────────────────────────────────────────────────

export const apiCitySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  active: z.boolean(),
})

export const apiOptionSchema = z.object({ id: z.string(), code: z.string(), label: z.string() })

const apiFileSchema = z.object({ key: z.string(), url: z.string().nullable() })

const apiHoursSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  closed: z.boolean(),
  opens: z.string().nullable(),
  closes: z.string().nullable(),
})

const apiDishSchema = z.object({
  name: z.string(),
  description: z.string(),
  reference_price: z.number(),
  currency: z.string(),
  photo: apiFileSchema.nullable(),
})

const apiSubmittedSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('business'),
    city_id: z.string(),
    business_type_id: z.string(),
    ruc: z.string(),
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    alternate_phone: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    hours: z.array(apiHoursSchema),
    signature_dish: apiDishSchema.nullable(),
  }),
  z.object({
    kind: z.literal('institution'),
    city_id: z.string(),
    institution_type_id: z.string(),
    name: z.string(),
    contact_email: z.string(),
    phone: z.string(),
    document: apiFileSchema,
  }),
  z.object({
    kind: z.literal('municipality'),
    city_id: z.string(),
    name: z.string(),
    contact_email: z.string(),
    phone: z.string(),
    document: apiFileSchema,
  }),
])

const apiResolutionSchema = z.object({
  approved: z.boolean(),
  reason: z.object({ code: z.string(), label: z.string() }).nullable(),
  note: z.string(),
  resolved_at: z.string(),
})

const apiSummarySchema = z.object({
  id: z.string(),
  kind: z.enum(ORGANIZATION_KINDS),
  organization_id: z.string(),
  organization_name: z.string(),
  status: z.enum(['submitted', 'in_review', 'approved', 'rejected']),
  submitted_at: z.string(),
  resolved_at: z.string().nullable(),
  resolution: apiResolutionSchema.nullable(),
})

/** `GET mine/` y `POST mine/resubmit/`. */
export const apiApplicationSchema = apiSummarySchema.extend({ submitted: apiSubmittedSchema })

/** El alta: la persona de la sesión (abierta en cookies) y su solicitud, sin los datos que mandó. */
export const apiApplicationSessionSchema = z.object({ user: apiSessionUserSchema, application: apiSummarySchema })

type ApiFile = z.infer<typeof apiFileSchema>
type ApiSubmitted = z.infer<typeof apiSubmittedSchema>

// ── Del API al portal ─────────────────────────────────────────────────────

const toFile = (api: ApiFile): StoredFile => ({ key: api.key, url: api.url, fileName: fileNameOfKey(api.key) })

/** `08:00:00` -> `08:00`, lo que entiende `<input type="time">`. */
export const toClock = (value: string | null): string => (value ? value.slice(0, 5) : '')

function toDayHours(api: z.infer<typeof apiHoursSchema>): DayHours {
  return { weekday: api.weekday, closed: api.closed, opens: toClock(api.opens), closes: toClock(api.closes) }
}

function toDish(api: z.infer<typeof apiDishSchema>): SignatureDish {
  return {
    name: api.name,
    description: api.description,
    referencePrice: String(api.reference_price),
    currency: api.currency === 'USD' ? 'USD' : 'NIO',
    photo: api.photo ? toFile(api.photo) : null,
  }
}

export function toOrganizationData(api: ApiSubmitted): OrganizationData {
  switch (api.kind) {
    case 'business':
      return {
        kind: 'business',
        cityId: api.city_id,
        businessTypeId: api.business_type_id,
        ruc: api.ruc,
        name: api.name,
        address: api.address,
        phone: api.phone,
        alternatePhone: api.alternate_phone,
        latitude: api.latitude,
        longitude: api.longitude,
        hours: normalizeHours(api.hours.map(toDayHours)),
        signatureDish: api.signature_dish
          ? toDish(api.signature_dish)
          : { name: '', description: '', referencePrice: '', currency: 'NIO', photo: null },
      }
    case 'institution':
      return {
        kind: 'institution',
        cityId: api.city_id,
        institutionTypeId: api.institution_type_id,
        name: api.name,
        contactEmail: api.contact_email,
        phone: api.phone,
        document: toFile(api.document),
      }
    case 'municipality':
      return {
        kind: 'municipality',
        cityId: api.city_id,
        name: api.name,
        contactEmail: api.contact_email,
        phone: api.phone,
        document: toFile(api.document),
      }
  }
}

type ApiSummary = z.infer<typeof apiSummarySchema>

export function toSummary(api: ApiSummary): Omit<MyApplication, 'submitted'> {
  return {
    id: api.id,
    kind: api.kind,
    organizationId: api.organization_id,
    organizationName: api.organization_name,
    status: api.status,
    submittedAt: api.submitted_at,
    resolvedAt: api.resolved_at,
    resolution: api.resolution && {
      approved: api.resolution.approved,
      reason: api.resolution.reason,
      note: api.resolution.note,
      resolvedAt: api.resolution.resolved_at,
    },
  }
}

export function toMyApplication(api: z.infer<typeof apiApplicationSchema>): MyApplication {
  return { ...toSummary(api), submitted: toOrganizationData(api.submitted) }
}

// ── Del portal al API ─────────────────────────────────────────────────────

/** El RUC se escribe con o sin espacios y en cualquier caso; el API lo guarda en mayúsculas. */
export const normalizeRuc = (value: string): string => value.replace(/\s/g, '').toUpperCase()

/** El precio se escribe con coma o con punto: al API siempre va con punto. */
export const normalizePrice = (value: string): string => value.trim().replace(',', '.')

function hoursBody(rows: readonly DayHours[]) {
  return rows.map((row) =>
    row.closed ? { weekday: row.weekday, closed: true } : { weekday: row.weekday, closed: false, opens: row.opens, closes: row.closes },
  )
}

/** Las coordenadas viajan como texto con seis decimales: un número de punto flotante arrastra ruido. */
const coordinate = (value: number | null): string => (value ?? 0).toFixed(6)

function dishBody(dish: SignatureDish) {
  return {
    name: dish.name.trim(),
    description: dish.description.trim(),
    reference_price: normalizePrice(dish.referencePrice),
    currency: dish.currency,
    photo_key: dish.photo?.key ?? '',
  }
}

/** Los datos de la organización, sin la cuenta: es lo mismo que se manda al alta y al corregir. */
export function organizationBody(data: OrganizationData) {
  switch (data.kind) {
    case 'business':
      return {
        city_id: data.cityId,
        business_type_id: data.businessTypeId,
        ruc: normalizeRuc(data.ruc),
        name: data.name.trim(),
        address: data.address.trim(),
        phone: data.phone.trim(),
        ...(data.alternatePhone.trim() ? { alternate_phone: data.alternatePhone.trim() } : {}),
        latitude: coordinate(data.latitude),
        longitude: coordinate(data.longitude),
        hours: hoursBody(data.hours),
        signature_dish: dishBody(data.signatureDish),
      }
    case 'institution':
      return {
        city_id: data.cityId,
        institution_type_id: data.institutionTypeId,
        name: data.name.trim(),
        contact_email: data.contactEmail.trim(),
        phone: data.phone.trim(),
        document_key: data.document?.key ?? '',
      }
    case 'municipality':
      return {
        city_id: data.cityId,
        name: data.name.trim(),
        contact_email: data.contactEmail.trim(),
        phone: data.phone.trim(),
        document_key: data.document?.key ?? '',
      }
  }
}

/** El alta: la cuenta de quien se postula y su organización. */
export function applicationBody(applicant: ApplicantInput, data: OrganizationData) {
  return {
    email: applicant.email.trim(),
    code: applicant.code.trim(),
    password: applicant.password,
    first_name: applicant.firstName.trim(),
    last_name: applicant.lastName.trim(),
    ...organizationBody(data),
  }
}

/** Corregir lo rechazado: los datos del alta, sin la cuenta y con `kind`. */
export function resubmitBody(data: OrganizationData) {
  return { kind: data.kind, ...organizationBody(data) }
}