/**
 * La solicitud de una organización (F3) en el backend de demo: las listas del formulario, la
 * subida de archivos, el alta y el estado. Habla el mismo formato que el API (docs/organizaciones.md
 * del repo del API) para que el portal no distinga si hay API o demo.
 */
import { z } from 'zod'
import { nowLocalDateTime, todayISO } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import {
  fileNameOfKey,
  normalizeHours,
  ORGANIZATION_KIND_LABELS,
  UPLOAD_RULES,
  type Organization,
  type OrganizationData,
  type OrganizationKind,
  type StoredFile,
  type User,
} from '../../models'
import { normalizeRuc } from '../../schemas/application-api.schema'
import type { MockDatabase } from '../db'
import { fail, MockHttpError, parseBody, requireUser, route } from '../http'
import { toApiSessionUser } from '../services/access'
import { BUSINESS_TYPES, CITIES, INSTITUTION_TYPES } from '../services/application-catalog'
import { instantNow, OPEN_STATUSES, wireApplication, wireSummary, type MockApplication } from '../services/applications'
import { demoSession } from '../services/demo-session'
import { DEMO_CODE } from '../services/demo-two-factor'

const INVALID_CODE = 'El código proporcionado no es válido.'

/** Como el API: una validación fallida es un 400 con el error de cada campo. */
const invalid = (fieldErrors: Record<string, string>) => new MockHttpError(400, 'Revisa los campos marcados', fieldErrors)

// ── Lo que manda el cliente (el mismo formato que valida el API) ──────────

const text = (max: number) => z.string().trim().min(1).max(max)
const phone = z.string().regex(/^[0-9+()\- ]{7,30}$/, { error: 'Escribe un teléfono válido' })
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
const coordinate = (min: number, max: number) => z.coerce.number().min(min).max(max)

const hours = z.array(
  z.object({
    weekday: z.number().int().min(0).max(6),
    closed: z.boolean().default(false),
    opens: clock.nullish(),
    closes: clock.nullish(),
  }),
)

const businessFields = {
  city_id: z.string().min(1),
  business_type_id: z.string().min(1),
  ruc: z.string().regex(/^[A-Za-z0-9-]{13,16}$/, { error: 'El RUC debe tener de 13 a 16 letras, números o guiones.' }),
  name: text(150),
  address: text(255),
  phone,
  alternate_phone: z.union([z.literal(''), phone]).optional(),
  latitude: coordinate(10.7, 15.1),
  longitude: coordinate(-87.7, -82.6),
  hours: hours.max(7),
  signature_dish: z.object({
    name: text(150),
    description: z.string().max(1000).optional(),
    reference_price: z.union([z.string(), z.number()]).refine((value) => Number(value) > 0, { error: 'El precio debe ser mayor que cero' }),
    currency: z.enum(['NIO', 'USD']),
    photo_key: z.string().min(1),
  }),
}
const institutionFields = {
  city_id: z.string().min(1),
  institution_type_id: z.string().min(1),
  name: text(150),
  contact_email: z.email(),
  phone,
  document_key: z.string().min(1),
}
const municipalityFields = {
  city_id: z.string().min(1),
  name: text(150),
  contact_email: z.email(),
  phone,
  document_key: z.string().min(1),
}
const accountFields = {
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(1).max(256),
  first_name: text(100),
  last_name: z.string().max(100).optional(),
}

const BODY_SCHEMAS = {
  business: z.object({ ...accountFields, ...businessFields }),
  institution: z.object({ ...accountFields, ...institutionFields }),
  municipality: z.object({ ...accountFields, ...municipalityFields }),
}

const RESUBMIT_SCHEMA = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('business'), ...businessFields }),
  z.object({ kind: z.literal('institution'), ...institutionFields }),
  z.object({ kind: z.literal('municipality'), ...municipalityFields }),
])

type ResubmitBody = z.infer<typeof RESUBMIT_SCHEMA>

const file = (key: string): StoredFile => ({ key, url: null, fileName: fileNameOfKey(key) })

/** El cuerpo del API → los datos de la organización con la forma del portal. */
function toData(body: ResubmitBody): OrganizationData {
  switch (body.kind) {
    case 'business':
      return {
        kind: 'business',
        cityId: body.city_id,
        businessTypeId: body.business_type_id,
        ruc: normalizeRuc(body.ruc),
        name: body.name,
        address: body.address,
        phone: body.phone,
        alternatePhone: body.alternate_phone ?? '',
        latitude: body.latitude,
        longitude: body.longitude,
        hours: normalizeHours(
          body.hours.map((row) => ({
            weekday: row.weekday,
            closed: row.closed,
            opens: row.closed ? '' : (row.opens ?? '').slice(0, 5),
            closes: row.closed ? '' : (row.closes ?? '').slice(0, 5),
          })),
        ),
        signatureDish: {
          name: body.signature_dish.name,
          description: body.signature_dish.description ?? '',
          referencePrice: String(body.signature_dish.reference_price),
          currency: body.signature_dish.currency,
          photo: file(body.signature_dish.photo_key),
        },
      }
    case 'institution':
      return {
        kind: 'institution',
        cityId: body.city_id,
        institutionTypeId: body.institution_type_id,
        name: body.name,
        contactEmail: body.contact_email,
        phone: body.phone,
        document: file(body.document_key),
      }
    case 'municipality':
      return {
        kind: 'municipality',
        cityId: body.city_id,
        name: body.name,
        contactEmail: body.contact_email,
        phone: body.phone,
        document: file(body.document_key),
      }
  }
}

/** El cuerpo de un alta, de la clase que sea: la cuenta de quien se postula y los datos de su organización. */
function parseApplication(kind: OrganizationKind, body: unknown) {
  switch (kind) {
    case 'business': {
      const input = parseBody(BODY_SCHEMAS.business, body)
      return { account: input, data: toData({ ...input, kind }) }
    }
    case 'institution': {
      const input = parseBody(BODY_SCHEMAS.institution, body)
      return { account: input, data: toData({ ...input, kind }) }
    }
    case 'municipality': {
      const input = parseBody(BODY_SCHEMAS.municipality, body)
      return { account: input, data: toData({ ...input, kind }) }
    }
  }
}

// ── Reglas de la organización ─────────────────────────────────────────────

/** Que la ciudad, el tipo y los archivos existan, y que no se repita lo que no puede repetirse. */
function assertAllowed(db: MockDatabase, data: OrganizationData, ownOrganizationId: string | null) {
  const errors: Record<string, string> = {}
  if (!CITIES.some((city) => city.id === data.cityId)) errors.city_id = 'Esa ciudad no existe.'

  const others = db.applications.filter((item) => item.organizationId !== ownOrganizationId)
  const conflicts: Record<string, string> = {}
  if (data.kind === 'business') {
    if (!BUSINESS_TYPES.some((type) => type.id === data.businessTypeId)) errors.business_type_id = 'Esa opción no existe.'
    if (!db.files[data.signatureDish.photo?.key ?? '']) errors['signature_dish.photo_key'] = 'No encontramos ese archivo. Súbelo de nuevo.'
    if (others.some((item) => item.data.kind === 'business' && item.data.ruc === data.ruc)) conflicts.ruc = 'Ya hay un comercio registrado con ese RUC.'
  } else {
    if (data.kind === 'institution' && !INSTITUTION_TYPES.some((type) => type.id === data.institutionTypeId)) {
      errors.institution_type_id = 'Esa opción no existe.'
    }
    if (!db.files[data.document?.key ?? '']) errors.document_key = 'No encontramos ese archivo. Súbelo de nuevo.'
    if (
      data.kind === 'institution' &&
      others.some((item) => item.data.kind === 'institution' && item.data.cityId === data.cityId && item.data.name.toLowerCase() === data.name.toLowerCase())
    ) {
      conflicts.name = 'Ya hay una institución con ese nombre en esa ciudad.'
    }
    if (data.kind === 'municipality' && others.some((item) => item.data.kind === 'municipality' && item.data.cityId === data.cityId)) {
      conflicts.city_id = 'Esa ciudad ya tiene una alcaldía registrada.'
    }
  }
  if (Object.keys(errors).length > 0) throw invalid(errors)
  if (Object.keys(conflicts).length > 0) throw new MockHttpError(409, 'Ya está registrado', conflicts)
}

const cityName = (data: OrganizationData) => CITIES.find((city) => city.id === data.cityId)?.name ?? ''

/** Lo que el portal necesita de la organización mientras no esté aprobada (`kind` es la etiqueta de la clase). */
const organizationOf = (id: string, data: OrganizationData, status: Organization['status'], contact: { name: string; email: string }): Organization => ({
  id,
  type: data.kind === 'business' ? 'negocio' : 'alcaldia',
  name: data.name,
  kind: ORGANIZATION_KIND_LABELS[data.kind],
  city: cityName(data),
  stopIds: [],
  status,
  contactName: contact.name,
  contactEmail: contact.email,
  contactPhone: data.phone,
  joinedAt: todayISO(),
})

function latestOf(db: MockDatabase, user: User): MockApplication {
  const own = db.applications.findLast((item) => !!user.organizationId && item.organizationId === user.organizationId)
  if (!own) throw fail.notFound('Tu cuenta no tiene una solicitud de organización.')
  return own
}

const newApplication = (db: MockDatabase, user: User, organizationId: string, data: OrganizationData): MockApplication => ({
  id: uniqueSlug(`orgapp-${data.name}`, (id) => db.applications.some((item) => item.id === id)),
  userId: user.id,
  organizationId,
  data,
  status: 'submitted',
  submittedAt: instantNow(),
  resolvedAt: null,
  resolution: null,
  takenById: null,
})

// ── Rutas ─────────────────────────────────────────────────────────────────

const ticketBody = z.object({
  kind: z.enum(['legal-document', 'signature-dish-photo', 'place-photo', 'circuit-photo']),
  content_type: z.string(),
  size: z.number().int().positive(),
})

const bucketBody = z.object({ key: z.string().min(1), dataUrl: z.string().startsWith('data:') })

const MAX_DATA_URL = 2_600_000

const EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const decisionBody = z.object({ decision: z.enum(['approved', 'rejected']) })

function applyRoute(kind: OrganizationKind) {
  return route(
    'POST',
    endpoints.organizationApplication[kind],
    ({ db, body }) => {
      const { account, data } = parseApplication(kind, body)
      const email = account.email.trim().toLowerCase()
      // Como el API: un correo que ya tiene cuenta falla igual que un código equivocado.
      if (account.code !== DEMO_CODE || db.users.some((user) => user.email.toLowerCase() === email)) {
        throw invalid({ code: INVALID_CODE })
      }
      assertAllowed(db, data, null)

      const organizationId = uniqueSlug(`org-${data.name}`, (id) => db.organizations.some((item) => item.id === id))
      const name = `${account.first_name} ${account.last_name ?? ''}`.trim()
      const user: User = {
        id: uniqueSlug(`user-${name}`, (id) => db.users.some((item) => item.id === id)),
        name,
        email,
        role: kind === 'business' ? 'negocio' : 'alcaldia',
        organizationId,
        staffRoleId: null,
        serviceRole: null,
        status: 'active',
        phone: data.phone,
        city: cityName(data),
        createdAt: todayISO(),
        lastSeenAt: nowLocalDateTime(),
      }
      const application = newApplication(db, user, organizationId, data)
      db.organizations.push(organizationOf(organizationId, data, 'pending', { name, email }))
      db.users.push(user)
      db.applications.push(application)
      // Quien se postula queda con la sesión abierta, como con las cookies del API real.
      demoSession.open(user.id)
      return { user: toApiSessionUser(db, user), application: wireSummary(application) }
    },
    { isPublic: true },
  )
}

export const applicationRoutes = [
  route('GET', endpoints.catalog.cities, () => CITIES, { isPublic: true }),
  route('GET', endpoints.catalog.businessTypes, () => BUSINESS_TYPES, { isPublic: true }),
  route('GET', endpoints.catalog.institutionTypes, () => INSTITUTION_TYPES, { isPublic: true }),

  route('POST', endpoints.auth.registerCode, () => undefined, { isPublic: true }),
  route(
    'POST',
    endpoints.auth.registerVerify,
    ({ body }) => {
      const { code } = parseBody(z.object({ email: z.email(), code: z.string() }), body)
      if (code !== DEMO_CODE) throw invalid({ code: INVALID_CODE })
      return undefined
    },
    { isPublic: true },
  ),

  route(
    'POST',
    endpoints.upload,
    ({ body }) => {
      const input = parseBody(ticketBody, body)
      const rule = UPLOAD_RULES[input.kind]
      if (!rule.contentTypes.includes(input.content_type)) throw invalid({ content_type: 'Ese tipo de archivo no se admite aquí.' })
      if (input.size > rule.maxBytes) throw invalid({ size: `El archivo pesa más de ${rule.maxBytes / (1024 * 1024)} MB.` })
      const key = `${input.kind}/${crypto.randomUUID()}${EXTENSIONS[input.content_type]}`
      return {
        key,
        url: `https://storage.demo/${key}`,
        method: 'PUT',
        headers: { 'Content-Type': input.content_type },
        expires_in: 600,
        max_bytes: rule.maxBytes,
      }
    },
    { isPublic: true },
  ),
  // No existe en el API: es el "almacenamiento" que recibe lo que el cliente sube con la URL firmada.
  route(
    'POST',
    endpoints.demoBucket,
    ({ db, body }) => {
      const { key, dataUrl } = parseBody(bucketBody, body)
      if (dataUrl.length > MAX_DATA_URL) throw invalid({ size: 'El archivo es muy pesado para el modo demo' })
      db.files[key] = dataUrl
      return undefined
    },
    { isPublic: true },
  ),

  applyRoute('business'),
  applyRoute('institution'),
  applyRoute('municipality'),

  route('GET', endpoints.organizationApplication.mine, (context) =>
    wireApplication(context.db.files, latestOf(context.db, requireUser(context))),
  ),
  route('POST', endpoints.organizationApplication.resubmit, (context) => {
    const { db } = context
    const user = requireUser(context)
    const latest = latestOf(db, user)
    if (OPEN_STATUSES.includes(latest.status)) throw fail.conflict('Tu solicitud todavía está en revisión.')
    if (latest.status === 'approved') throw fail.conflict('Tu solicitud ya fue aprobada.')
    const input = parseBody(RESUBMIT_SCHEMA, context.body)
    if (input.kind !== latest.data.kind) throw invalid({ kind: 'Esos datos no son de tu tipo de organización.' })
    const data = toData(input)
    assertAllowed(db, data, latest.organizationId)

    // Corrige la misma ficha, que sigue sin verificar, y abre otro expediente.
    const organization = db.organizations.find((item) => item.id === latest.organizationId)
    if (organization) Object.assign(organization, organizationOf(organization.id, data, organization.status, { name: organization.contactName, email: organization.contactEmail }))
    const application = newApplication(db, user, latest.organizationId, data)
    db.applications.push(application)
    return wireApplication(db.files, application)
  }),

  // No existe en el API: hace de equipo de K'Plan y resuelve la solicitud de quien entró, para ver las dos salidas.
  route('POST', endpoints.demoDecision, (context) => {
    const { db } = context
    const latest = latestOf(db, requireUser(context))
    if (!OPEN_STATUSES.includes(latest.status)) throw fail.conflict('Esta solicitud ya se resolvió.')
    const { decision } = parseBody(decisionBody, context.body)
    const approved = decision === 'approved'
    latest.status = approved ? 'approved' : 'rejected'
    latest.resolvedAt = instantNow()
    latest.resolution = approved
      ? { approved: true, reasonCode: null, note: 'Bienvenida a K\'Plan.' }
      : { approved: false, reasonCode: 'datos_no_coinciden', note: 'Es una prueba del modo demo: así se ve un rechazo con su motivo.' }
    const organization = db.organizations.find((item) => item.id === latest.organizationId)
    if (organization && approved) organization.status = 'active'
    return wireSummary(latest)
  }),
]
