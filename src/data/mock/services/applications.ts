import {
  fileNameOfKey,
  normalizeHours,
  sameHoursEveryDay,
  type Organization,
  type OrganizationApplication,
  type OrganizationData,
  type RequestStatus,
  type StoredFile,
  type User,
} from '../../models'
import { BUSINESS_TYPES, cityByName, CITIES, REJECTION_REASONS } from './application-catalog'

/** El expediente de verificación de una organización, como lo guarda el backend de demo. */
export interface MockApplication {
  id: string
  userId: string
  organizationId: string
  data: OrganizationData
  status: RequestStatus
  /** Con el desfase de Nicaragua: `2026-10-05T14:30:00-06:00`. */
  submittedAt: string
  resolvedAt: string | null
  resolution: { approved: boolean; reasonCode: string | null; note: string } | null
}

/** Los archivos "subidos" del modo demo: la clave y su contenido como `data:`. */
export type MockFiles = Record<string, string>

export const OPEN_STATUSES: readonly RequestStatus[] = ['submitted', 'in_review']

const MANAGUA_OFFSET = '-06:00'

/** `2026-10-05T14:30` (hora de Nicaragua) → el instante con su desfase. */
export const toInstant = (local: string): string => `${local.slice(0, 16)}:00${MANAGUA_OFFSET}`

export const instantNow = (): string => new Date().toISOString()

// ── Hacia el formato del API ──────────────────────────────────────────────

function wireFile(files: MockFiles, file: StoredFile | null) {
  return file && { key: file.key, url: files[file.key] ?? null }
}

function wireOrganization(files: MockFiles, data: OrganizationData) {
  switch (data.kind) {
    case 'business':
      return {
        kind: 'business',
        city_id: data.cityId,
        business_type_id: data.businessTypeId,
        ruc: data.ruc,
        name: data.name,
        address: data.address,
        phone: data.phone,
        alternate_phone: data.alternatePhone,
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
        hours: normalizeHours(data.hours).map((row) => ({
          weekday: row.weekday,
          closed: row.closed,
          opens: row.closed ? null : `${row.opens}:00`,
          closes: row.closed ? null : `${row.closes}:00`,
        })),
        signature_dish: {
          name: data.signatureDish.name,
          description: data.signatureDish.description,
          reference_price: Number(data.signatureDish.referencePrice),
          currency: data.signatureDish.currency,
          photo: wireFile(files, data.signatureDish.photo),
        },
      }
    case 'institution':
      return {
        kind: 'institution',
        city_id: data.cityId,
        institution_type_id: data.institutionTypeId,
        name: data.name,
        contact_email: data.contactEmail,
        phone: data.phone,
        document: wireFile(files, data.document),
      }
    case 'municipality':
      return {
        kind: 'municipality',
        city_id: data.cityId,
        name: data.name,
        contact_email: data.contactEmail,
        phone: data.phone,
        document: wireFile(files, data.document),
      }
  }
}

/** La solicitud sin los datos que mandó: lo que responde el alta. */
export function wireSummary(application: MockApplication) {
  const reason = REJECTION_REASONS.find((item) => item.code === application.resolution?.reasonCode)
  return {
    id: application.id,
    kind: application.data.kind,
    organization_id: application.organizationId,
    organization_name: application.data.name,
    status: application.status,
    submitted_at: application.submittedAt,
    resolved_at: application.resolvedAt,
    resolution:
      application.resolution && application.resolvedAt
        ? {
            approved: application.resolution.approved,
            reason: reason ? { code: reason.code, label: reason.label } : null,
            note: application.resolution.note,
            resolved_at: application.resolvedAt,
          }
        : null,
  }
}

/** Lo que responde `GET mine/` y `POST mine/resubmit/`: la solicitud con lo que se mandó. */
export function wireApplication(files: MockFiles, application: MockApplication) {
  return { ...wireSummary(application), submitted: wireOrganization(files, application.data) }
}

// ── Siembra ───────────────────────────────────────────────────────────────

/** Una imagen de relleno para las fotos y los documentos de los expedientes sembrados. */
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#efe7d8"/><circle cx="160" cy="120" r="68" fill="#fff" stroke="#c9b99a" stroke-width="6"/><circle cx="160" cy="120" r="36" fill="none" stroke="#c9b99a" stroke-width="4"/></svg>',
  )

const PLACEHOLDER_PDF =
  'data:application/pdf;base64,' +
  btoa('%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')

function seedFile(files: MockFiles, key: string, content: string): StoredFile {
  files[key] = content
  return { key, url: null, fileName: fileNameOfKey(key) }
}

function lastChangeRequest(application: OrganizationApplication): string {
  const event = application.history.findLast((item) => item.kind === 'changes_requested')
  return event ? event.text.replace(/^Pidió una corrección: /, '') : 'Revisa tus datos y vuelve a enviarla.'
}

/**
 * Los expedientes del modo demo, a partir de las solicitudes que ya traía: las abiertas esperan al
 * equipo, y a la que pedía una corrección se le rechaza con el motivo, para poder probar cómo se corrige.
 */
export function seedApplications(
  applications: readonly OrganizationApplication[],
  organizations: readonly Organization[],
  users: readonly User[],
): { applications: MockApplication[]; files: MockFiles } {
  const files: MockFiles = {}
  const result: MockApplication[] = []

  for (const old of applications) {
    const organization = organizations.find((item) => item.id === old.organizationId)
    const user = users.find((item) => item.organizationId === old.organizationId)
    if (!organization || !user) continue
    const city = cityByName(old.city) ?? CITIES[0]
    const phone = old.representative.phone || '+505 8888 8888'
    const data: OrganizationData =
      old.type === 'negocio'
        ? {
            kind: 'business',
            cityId: city.id,
            businessTypeId: BUSINESS_TYPES.find((type) => type.label.toLowerCase() === old.kind.toLowerCase())?.id ?? BUSINESS_TYPES[0].id,
            ruc: old.ruc ?? 'J0310000000000',
            name: old.name,
            address: old.address,
            phone,
            alternatePhone: '',
            latitude: city.latitude,
            longitude: city.longitude,
            hours: sameHoursEveryDay('08:00', '17:00', [0]),
            signatureDish: {
              name: 'El plato de la casa',
              description: old.description.slice(0, 200),
              referencePrice: '150',
              currency: 'NIO',
              photo: seedFile(files, `signature-dish-photo/${old.id}.jpg`, PLACEHOLDER_IMAGE),
            },
          }
        : {
            kind: 'municipality',
            cityId: city.id,
            name: old.name,
            contactEmail: old.representative.email,
            phone,
            document: seedFile(files, `legal-document/${old.id}.pdf`, PLACEHOLDER_PDF),
          }

    const decided = old.status === 'approved' || old.status === 'rejected' || old.status === 'changes_requested'
    const approved = old.status === 'approved'
    result.push({
      id: old.id,
      userId: user.id,
      organizationId: old.organizationId,
      data,
      status: decided ? (approved ? 'approved' : 'rejected') : old.assigneeId ? 'in_review' : 'submitted',
      submittedAt: toInstant(old.submittedAt),
      resolvedAt: decided ? toInstant(old.decidedAt ?? old.stageSince) : null,
      resolution: decided
        ? {
            approved,
            reasonCode: approved ? null : old.status === 'changes_requested' ? 'datos_no_coinciden' : 'otro',
            note: approved ? old.decisionNote : old.status === 'changes_requested' ? lastChangeRequest(old) : old.decisionNote,
          }
        : null,
    })
  }
  return { applications: result, files }
}
