/**
 * Las solicitudes de negocios y alcaldías: las ya aprobadas de las
 * organizaciones activas y las que esperan revisión
 * (organization_applications.json), con su cuenta, su organización en
 * revisión y el borrador de su lugar.
 */
import { addDays, diffDays, nowMinutes, toLocalDateTime, type ISODate, type LocalDateTime } from '@/lib/dates'
import { lowerFirst } from '@/lib/format'
import { createRandom, hashSeed, type Random } from '@/lib/random'
import { slugify } from '@/lib/slug'
import {
  ORGANIZATION_DOCUMENT_INFO,
  ORGANIZATION_DOCUMENT_RULES,
  type DocumentStatus,
  type Organization,
  type OrganizationApplication,
  type OrganizationDocument,
  type OrganizationDocumentType,
  type PlaceRequest,
  type ReviewEvent,
  type Stop,
  type User,
} from '../../models'
import { catalog, type AdmissionSeed } from '../catalog'
import { documentScans } from './document-scans'

const HOUR = 60

function moment(today: ISODate, daysAgo: number, minutes: number): LocalDateTime {
  const clamped = daysAgo === 0 ? Math.max(0, Math.min(minutes, nowMinutes() - 20)) : minutes
  return toLocalDateTime(addDays(today, -daysAgo), clamped)
}

function later(value: LocalDateTime, minutes: number): LocalDateTime {
  const base = Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16))
  return toLocalDateTime(value.slice(0, 10), base + minutes)
}

function scanBody(type: OrganizationDocumentType, seed: AdmissionSeed, year: number): string {
  const holder = seed.legalName ?? seed.name
  switch (type) {
    case 'ruc':
      return `Se hace constar que ${holder} está inscrito en el Registro Único de Contribuyentes con el número ${seed.ruc}, en estado activo, con actividad económica: ${lowerFirst(seed.kind)}.`
    case 'matricula-municipal':
      return `La Alcaldía de ${seed.city} otorga la matrícula municipal a ${seed.name}, ubicado en ${seed.address}, para el año ${year}.`
    case 'carta-designacion':
      return `El despacho del alcalde designa a ${seed.representative.name}, ${lowerFirst(seed.representative.role)}, para administrar en K'Plan los lugares públicos y eventos de ${seed.city}.`
    case 'licencia-intur':
      return `El Instituto Nicaragüense de Turismo otorga licencia de turismo a ${holder} en la categoría de operadora de turismo receptivo.`
    case 'permiso-sanitario':
      return `Se certifica que ${seed.name} cumple las condiciones sanitarias para la preparación y venta de alimentos y bebidas.`
    case 'cedula-representante':
      return ''
  }
}

function scanNumber(random: Random, type: OrganizationDocumentType, seed: AdmissionSeed, year: number): string {
  switch (type) {
    case 'ruc':
      return seed.ruc ?? ''
    case 'cedula-representante':
      return seed.representative.cedula
    case 'matricula-municipal':
      return `MM-${year}-${random.int(10000, 99999)}`
    case 'carta-designacion':
      return `OF-DA-${random.int(100, 999)}-${year}`
    case 'licencia-intur':
      return `LT-${random.int(1000, 9999)}`
    case 'permiso-sanitario':
      return `PS-${random.int(10000, 99999)}`
  }
}

function buildApplication(seed: AdmissionSeed, submittedDaysAgo: number, today: ISODate, staff: Map<string, string>): OrganizationApplication {
  const random = createRandom(hashSeed(`kplan-admission:${seed.id}`))
  const submittedAt = moment(today, submittedDaysAgo, submittedDaysAgo === 0 ? 7 * HOUR + random.int(0, 40) : random.int(9, 18) * HOUR + random.int(0, 59))
  const stageSince = seed.stageDaysAgo === submittedDaysAgo ? submittedAt : moment(today, seed.stageDaysAgo, random.int(9, 16) * HOUR + random.int(0, 59))
  const reviewerId = seed.assigneeId ?? 'user-admin'
  const reviewerName = staff.get(reviewerId) ?? "Equipo K'Plan"
  const history: Omit<ReviewEvent, 'id'>[] = []
  const log = (at: LocalDateTime, kind: ReviewEvent['kind'], text: string, byApplicant = false) =>
    history.push({ at, kind, text, actorId: byApplicant ? null : reviewerId, actorName: byApplicant ? seed.representative.name : reviewerName })

  const types = Object.keys(seed.documents) as OrganizationDocumentType[]
  const assisted = seed.assisted
    ? { byId: seed.assisted.byId, byName: staff.get(seed.assisted.byId) ?? "Equipo K'Plan", fee: seed.assisted.fee }
    : null
  if (assisted) {
    history.push({
      at: submittedAt,
      kind: 'submitted',
      actorId: assisted.byId,
      actorName: assisted.byName,
      text: `Llenó la solicitud por ${seed.name} con ${types.length} documentos (alta asistida${assisted.fee > 0 ? `, se cobra C$ ${assisted.fee} al aprobarla` : ', sin costo'}). Le llegó una invitación a ${seed.representative.email}`,
    })
  } else {
    log(submittedAt, 'submitted', `Envió la solicitud desde el portal con ${types.length} documentos`, true)
  }
  if (seed.assigneeId) log(later(submittedAt, 2 * HOUR), 'assigned', `${reviewerName} tomó la solicitud`)

  const year = Number(today.slice(0, 4))
  const documents: OrganizationDocument[] = types.map((type, index) => {
    const status = seed.documents[type] as DocumentStatus
    const info = ORGANIZATION_DOCUMENT_INFO[type]
    const reviewedAt = status === 'pending' ? null : later(submittedAt, 3 * HOUR + index * 50)
    const scanYear = status === 'rejected' && type === 'matricula-municipal' ? year - 1 : year
    const issuedOn = addDays(today, -random.int(20, 200))
    if (reviewedAt) {
      log(
        reviewedAt,
        status === 'accepted' ? 'document_accepted' : 'document_rejected',
        status === 'accepted' ? `Aceptó: ${lowerFirst(info.label)}` : `Rechazó: ${lowerFirst(info.label)}. ${seed.notes[type] ?? ''}`.trim(),
      )
    }
    return {
      id: `${seed.id}-${type}`,
      type,
      fileName: `${type}-${slugify(seed.name)}.${info.format === 'card' ? 'jpg' : 'pdf'}`,
      pages: documentScans({
        info,
        name: type === 'cedula-representante' ? seed.representative.name : (seed.legalName ?? seed.name),
        city: seed.city,
        number: scanNumber(random, type, seed, scanYear),
        issuedOn: status === 'rejected' ? `${scanYear}-02-10` : issuedOn,
        expiresOn: type === 'cedula-representante' ? addDays(issuedOn, 3650) : type === 'licencia-intur' || type === 'permiso-sanitario' ? addDays(issuedOn, 365) : null,
        body: scanBody(type, seed, scanYear),
      }),
      number: null,
      detail: null,
      issuedOn: null,
      expiresOn: null,
      uploadedAt: submittedAt,
      status,
      checks: status === 'accepted' ? info.checks.map((check) => check.id) : status === 'rejected' ? info.checks.slice(0, -2).map((check) => check.id) : [],
      note: seed.notes[type] ?? '',
      reviewedBy: reviewedAt ? reviewerId : null,
      reviewedAt,
    }
  })

  if (seed.status === 'changes_requested') {
    log(stageSince, 'changes_requested', `Pidió una corrección: ${documents.filter((document) => document.note).map((document) => document.note).join(' ')}`)
  }
  const decided = seed.status === 'approved' || seed.status === 'rejected'
  if (seed.stage === 'decision') log(decided ? later(stageSince, -4 * HOUR) : stageSince, 'stage', 'Pasó a decisión')
  if (seed.status === 'approved') log(stageSince, 'approved', 'Aprobó la solicitud')

  const {
    submittedDaysAgo: _submitted,
    stageDaysAgo: _stage,
    documents: _documents,
    notes: _notes,
    newPlace: _newPlace,
    assisted: _assisted,
    ...fields
  } = seed
  return {
    ...fields,
    assisted,
    newStopId: null,
    submittedAt,
    stageSince,
    documents,
    decisionNote: '',
    decidedAt: decided ? stageSince : null,
    history: history.sort((a, b) => a.at.localeCompare(b.at)).map((event, index) => ({ ...event, id: `${seed.id}-event-${index + 1}` })),
  }
}

/** Una organización activa entró por una solicitud aprobada, unos días después de postularse. */
function approvedSeed(organization: Organization, user: User | undefined): AdmissionSeed {
  const rules = ORGANIZATION_DOCUMENT_RULES[organization.type]
  return {
    id: `orgapp-${organization.id.replace(/^org-/, '')}`,
    organizationId: organization.id,
    userId: user?.id ?? '',
    type: organization.type,
    name: organization.name,
    legalName: organization.type === 'negocio' ? organization.name : null,
    ruc: organization.type === 'negocio' ? `J03100${String(hashSeed(organization.id)).slice(0, 8).padEnd(8, '0')}` : null,
    kind: organization.kind,
    city: organization.city,
    address: organization.city,
    description: `${organization.kind} en ${organization.city}.`,
    representative: {
      name: organization.contactName,
      cedula: '001-010180-0001A',
      role: organization.type === 'negocio' ? 'Propietario' : 'Turismo municipal',
      phone: organization.contactPhone,
      email: organization.contactEmail,
    },
    claimedStopIds: [...organization.stopIds],
    newPlace: null,
    stage: 'decision',
    status: 'approved',
    assigneeId: 'user-admin',
    stageDaysAgo: 0,
    documents: Object.fromEntries(rules.required.map((type) => [type, 'accepted'])),
    notes: {},
  }
}

function cityCenter(stops: readonly Stop[], city: string) {
  const inCity = stops.filter((stop) => stop.city === city)
  if (inCity.length === 0) return { latitude: 12.1328, longitude: -86.2504 }
  return {
    latitude: inCity.reduce((sum, stop) => sum + stop.coordinates.latitude, 0) / inCity.length,
    longitude: inCity.reduce((sum, stop) => sum + stop.coordinates.longitude, 0) / inCity.length,
  }
}

/** Una organización aprobada pidió un lugar nuevo: queda como borrador suyo hasta que se decida. */
export function seedPlaceRequests(today: ISODate, organizations: Organization[], stops: Stop[]): PlaceRequest[] {
  const finca = organizations.find((organization) => organization.id === 'org-finca-el-mirador')
  if (!finca) return []
  const stop: Stop = {
    id: 'matagalpa-sendero-del-cafetal',
    name: 'Sendero del cafetal',
    category: 'Naturaleza',
    city: finca.city,
    address: 'Finca El Mirador, entrada por el beneficio húmedo',
    duration: '1 h',
    rating: 0,
    reviewsCount: 0,
    hasBadge: false,
    description: 'Caminata de una hora entre los cafetos de sombra, con parada en el mirador del valle.',
    tip: '',
    images: [],
    coordinates: cityCenter(stops, finca.city),
    draft: true,
  }
  stops.push(stop)
  finca.stopIds.push(stop.id)
  return [
    {
      id: 'pedido-sendero-del-cafetal',
      organizationId: finca.id,
      organizationName: finca.name,
      requestedByName: finca.contactName,
      kind: 'new',
      stopId: stop.id,
      stopName: stop.name,
      note: 'Abrimos el sendero en agosto; queremos que los grupos del circuito del café lo puedan agendar.',
      status: 'pending',
      requestedAt: moment(today, 1, 16 * HOUR + 20),
      decidedAt: null,
      decidedByName: null,
      decisionNote: '',
    },
  ]
}

export function seedAdmissions(
  today: ISODate,
  users: User[],
  organizations: Organization[],
  stops: Stop[],
): { applications: OrganizationApplication[]; users: User[]; organizations: Organization[]; stops: Stop[] } {
  const staff = new Map(users.filter((user) => user.role === 'admin').map((user) => [user.id, user.name]))
  const newUsers: User[] = []
  const newOrganizations: Organization[] = []
  const drafts: Stop[] = []

  const approved = organizations
    .filter((organization) => organization.status === 'active')
    .map((organization) => {
      const seed = approvedSeed(organization, users.find((user) => user.organizationId === organization.id))
      const joinedDaysAgo = Math.max(4, diffDays(organization.joinedAt, today))
      return buildApplication({ ...seed, stageDaysAgo: joinedDaysAgo - 3 }, joinedDaysAgo, today, staff)
    })

  const pending = catalog.admissions.map((seed) => {
    const existing = organizations.find((organization) => organization.id === seed.organizationId)
    const submittedDaysAgo = seed.submittedDaysAgo ?? (existing ? Math.max(1, diffDays(existing.joinedAt, today)) : 0)
    const application = buildApplication(seed, submittedDaysAgo, today, staff)
    const createdAt = application.submittedAt.slice(0, 10)

    if (seed.newPlace) {
      const stop: Stop = {
        id: slugify(`${seed.city}-${seed.newPlace.name}`),
        name: seed.newPlace.name,
        category: seed.newPlace.category,
        city: seed.city,
        address: seed.newPlace.address,
        duration: '45 min',
        rating: 0,
        reviewsCount: 0,
        hasBadge: false,
        description: seed.description,
        tip: '',
        images: [],
        coordinates: cityCenter(stops, seed.city),
        draft: true,
      }
      drafts.push(stop)
      application.newStopId = stop.id
    }
    if (!existing) {
      newOrganizations.push({
        id: seed.organizationId,
        type: seed.type,
        name: seed.name,
        kind: seed.kind,
        city: seed.city,
        stopIds: application.newStopId ? [application.newStopId] : [],
        status: 'pending',
        contactName: seed.representative.name,
        contactEmail: seed.representative.email,
        contactPhone: seed.representative.phone,
        joinedAt: createdAt,
      })
    }
    if (!users.some((user) => user.id === seed.userId)) {
      newUsers.push({
        id: seed.userId,
        name: seed.representative.name,
        email: seed.representative.email,
        role: seed.type,
        organizationId: seed.organizationId,
        staffRoleId: null,
        serviceRole: null,
        status: 'active',
        phone: seed.representative.phone,
        city: seed.city,
        createdAt,
        lastSeenAt: application.history.findLast((event) => event.actorId === null)?.at ?? application.submittedAt,
      })
    }
    return application
  })

  return {
    applications: [...approved, ...pending],
    users: [...users, ...newUsers],
    organizations: [...organizations, ...newOrganizations],
    stops: [...stops, ...drafts],
  }
}
