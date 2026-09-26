/**
 * Las personas de la demo, relativas al día en que se siembra: el equipo y
 * las organizaciones (users.json), los guías de la app ya verificados, los
 * guías que esperan verificación (guide_applications.json) y turistas.
 */
import { addDays, nowMinutes, toLocalDateTime, type ISODate, type LocalDateTime } from '@/lib/dates'
import { lowerFirst } from '@/lib/format'
import { createRandom, hashSeed, type Random } from '@/lib/random'
import { slugify } from '@/lib/slug'
import {
  BACKGROUND_CHECK_INFO,
  CITIES,
  DOCUMENT_TYPE_INFO,
  requiredChecks,
  requiredDocuments,
  type BackgroundCheck,
  type DocumentStatus,
  type DocumentType,
  type GuideApplication,
  type GuideDocument,
  type ReviewEvent,
  type User,
} from '../../models'
import { catalog, type AppGuide, type ApplicationSeed } from '../catalog'
import { documentScans } from './document-scans'

/** guides.json de la app no trae ciudad. */
const APP_GUIDE_CITIES: Record<string, string> = {
  'guide-marlene': 'Granada',
  'guide-esteban': 'León',
  'guide-fatima': 'León',
  'guide-oscar': 'Masaya',
  'guide-valeria': 'Masaya',
  'guide-ramon': 'León',
  'guide-translator-hans': 'Granada',
  'guide-translator-noemi': 'Granada',
}

const HOUR = 60

/** Hoy, nunca después de la hora en que se siembra la demo. */
function moment(today: ISODate, daysAgo: number, minutes: number): LocalDateTime {
  const clamped = daysAgo === 0 ? Math.max(0, Math.min(minutes, nowMinutes() - 15)) : minutes
  return toLocalDateTime(addDays(today, -daysAgo), clamped)
}

function later(value: LocalDateTime, minutes: number): LocalDateTime {
  const date = value.slice(0, 10)
  const base = Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16))
  return toLocalDateTime(date, base + minutes)
}

function emailFor(name: string, index = 0): string {
  const [first, ...rest] = slugify(name).split('-')
  return `${first}.${rest.at(-1) ?? 'kplan'}${index > 0 ? index : ''}@correo.demo`
}

function phone(random: Random): string {
  return `+505 8${random.int(100, 999)} ${random.int(1000, 9999)}`
}

function documentNumber(random: Random, type: DocumentType, issuedOn: ISODate): string {
  switch (type) {
    case 'cedula': {
      const [year, month, day] = issuedOn.split('-')
      return `${String(random.int(1, 616)).padStart(3, '0')}-${day}${month}${year.slice(2)}-${random.int(1000, 9999)}${'ABCDEFGHJKLMNPQRSTUVWXY'[random.int(0, 22)]}`
    }
    case 'record-policia':
      return `PN-${issuedOn.slice(0, 4)}-${random.int(100000, 999999)}`
    case 'carne-intur':
      return `INTUR-GT-${random.int(1000, 9999)}`
    case 'primeros-auxilios':
      return `CRN-PA-${random.int(10000, 99999)}`
    case 'certificado-idioma':
      return `CI-${random.int(10000, 99999)}`
    case 'licencia-conducir':
      return `LC-${random.int(1000000, 9999999)}`
    case 'seguro-vehiculo':
      return `POL-${random.int(100000, 999999)}`
  }
}

/** Cuándo se emitió y cuándo vence, según el tipo. */
function validity(random: Random, type: DocumentType, today: ISODate): { issuedOn: ISODate; expiresOn: ISODate | null } {
  const issued = (min: number, max: number) => addDays(today, -random.int(min, max))
  switch (type) {
    case 'cedula': {
      const issuedOn = issued(400, 2500)
      return { issuedOn, expiresOn: addDays(issuedOn, 3650) }
    }
    case 'record-policia':
      return { issuedOn: issued(8, 60), expiresOn: null }
    case 'carne-intur': {
      const issuedOn = issued(90, 300)
      return { issuedOn, expiresOn: addDays(issuedOn, 730) }
    }
    case 'primeros-auxilios': {
      const issuedOn = issued(60, 400)
      return { issuedOn, expiresOn: addDays(issuedOn, 730) }
    }
    case 'certificado-idioma':
      return { issuedOn: issued(200, 900), expiresOn: null }
    case 'licencia-conducir': {
      const issuedOn = issued(300, 1200)
      return { issuedOn, expiresOn: addDays(issuedOn, 1825) }
    }
    case 'seguro-vehiculo': {
      const issuedOn = issued(20, 200)
      return { issuedOn, expiresOn: addDays(issuedOn, 365) }
    }
  }
}

const LEVELS = ['B2', 'C1', 'C2']

interface ApplicationDraft {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  city: string
  photoUrl: string
  seed: ApplicationSeed
  reviewerId: string
}

function buildApplication(draft: ApplicationDraft, today: ISODate, staff: Map<string, string>): GuideApplication {
  const { seed } = draft
  const random = createRandom(hashSeed(`kplan-application:${draft.id}`))
  const submittedAt = moment(today, seed.submittedDaysAgo, seed.submittedDaysAgo === 0 ? 7 * HOUR + random.int(0, 50) : random.int(8, 19) * HOUR + random.int(0, 59))
  const stageSince = seed.stageDaysAgo === seed.submittedDaysAgo ? submittedAt : moment(today, seed.stageDaysAgo, seed.stageDaysAgo === 0 ? 7 * HOUR + random.int(20, 55) : random.int(9, 17) * HOUR + random.int(0, 59))
  const reviewerId = seed.assigneeId ?? draft.reviewerId
  const reviewerName = staff.get(reviewerId) ?? "Equipo K'Plan"
  const history: Omit<ReviewEvent, 'id'>[] = []
  const log = (at: LocalDateTime, kind: ReviewEvent['kind'], text: string, byApplicant = false) =>
    history.push({ at, kind, text, actorId: byApplicant ? null : reviewerId, actorName: byApplicant ? draft.name : reviewerName })

  const foreign = seed.languages.filter((language) => language !== 'Español')
  const documentTypes = requiredDocuments(seed).filter((type) => seed.documents[type] !== undefined)
  log(submittedAt, 'submitted', `Envió su solicitud desde la app con ${documentTypes.length} documentos`, true)
  if (seed.assigneeId) log(later(submittedAt, 2 * HOUR + 10), 'assigned', `${reviewerName} tomó la solicitud`)

  const documents: GuideDocument[] = documentTypes.map((type, index) => {
    const status = seed.documents[type] as DocumentStatus
    const info = DOCUMENT_TYPE_INFO[type]
    const resubmitted = seed.correction?.document === type
    const uploadedAt = resubmitted ? stageSince : submittedAt
    const reviewedAt = status === 'pending' ? null : later(submittedAt, 3 * HOUR + index * 55)
    const { issuedOn, expiresOn } = validity(random, type, today)
    const detail =
      type === 'certificado-idioma'
        ? (status === 'rejected' ? foreign.slice(0, 1) : foreign).map((language) => `${language} ${random.pick(LEVELS)}`).join(' · ')
        : null
    if (reviewedAt) {
      log(
        reviewedAt,
        status === 'accepted' ? 'document_accepted' : 'document_rejected',
        status === 'accepted' ? `Aceptó: ${lowerFirst(info.label)}` : `Rechazó: ${lowerFirst(info.label)}. ${seed.notes[type] ?? ''}`.trim(),
      )
    }
    const number = documentNumber(random, type, issuedOn)
    return {
      id: `${draft.id}-${type}`,
      type,
      fileName: `${type}-${slugify(draft.name)}.${info.format === 'card' ? 'jpg' : 'pdf'}`,
      pages: documentScans({ type, name: draft.name, city: draft.city, number, detail, issuedOn, expiresOn }),
      number,
      detail,
      issuedOn,
      expiresOn,
      uploadedAt,
      status,
      checks:
        status === 'accepted'
          ? info.checks.map((check) => check.id)
          : status === 'rejected'
            ? info.checks.slice(0, -2).map((check) => check.id)
            : [],
      note: seed.notes[type] ?? '',
      reviewedBy: reviewedAt ? reviewerId : null,
      reviewedAt,
    }
  })

  if (seed.correction) {
    const requestedAt = moment(today, seed.correction.requestedDaysAgo, 11 * HOUR + 20)
    log(requestedAt, 'changes_requested', `Pidió una corrección: ${seed.correction.note}`)
    log(stageSince, 'resubmitted', `Subió un documento nuevo: ${lowerFirst(DOCUMENT_TYPE_INFO[seed.correction.document].label)}`, true)
  }
  if (seed.status === 'changes_requested') {
    const rejected = documents.filter((document) => document.status === 'rejected')
    log(stageSince, 'changes_requested', `Pidió una corrección: ${rejected.map((document) => document.note).join(' ')}`)
  }

  const decided = seed.status === 'approved' || seed.status === 'rejected'
  const decisionEnteredAt = decided ? moment(today, seed.stageDaysAgo + 1, 10 * HOUR) : stageSince
  const backgroundAt =
    seed.stage === 'background'
      ? stageSince
      : moment(today, Math.round((seed.submittedDaysAgo + seed.stageDaysAgo + (decided ? 1 : 0)) / 2), 9 * HOUR + 15)
  if (seed.stage !== 'documents') log(backgroundAt, 'stage', 'Pasó a antecedentes')

  const background: BackgroundCheck[] = requiredChecks(seed).map((type, index) => {
    const status = seed.stage === 'documents' ? 'pending' : (seed.checks[type] ?? 'pending')
    const checkedAt = status === 'pending' ? null : later(backgroundAt, 2 * HOUR + index * 95)
    if (checkedAt) {
      const label = lowerFirst(BACKGROUND_CHECK_INFO[type].label)
      log(
        checkedAt,
        status === 'clear' ? 'check_clear' : 'check_flagged',
        status === 'clear' ? `Verificó ${label}: sin problemas` : `Verificó ${label}: ${seed.notes[type] ?? 'con observaciones'}`,
      )
    }
    return { type, status, note: seed.notes[type] ?? '', checkedBy: checkedAt ? reviewerId : null, checkedAt }
  })

  if (seed.stage === 'decision') log(decisionEnteredAt, 'stage', 'Pasó a decisión')
  if (decided) {
    log(stageSince, seed.status === 'approved' ? 'approved' : 'rejected', seed.status === 'approved' ? 'Aprobó la solicitud' : `Rechazó la solicitud: ${seed.decisionNote ?? ''}`.trim())
  }

  return {
    id: draft.id,
    userId: draft.userId,
    name: draft.name,
    email: draft.email,
    phone: draft.phone,
    city: draft.city,
    photoUrl: draft.photoUrl,
    serviceRole: seed.serviceRole,
    languages: seed.languages,
    specialties: seed.specialties,
    yearsExperience: seed.yearsExperience,
    hasTransport: seed.hasTransport,
    bio: seed.bio,
    references: seed.references,
    submittedAt,
    stage: seed.stage,
    stageSince,
    status: seed.status,
    assigneeId: seed.assigneeId,
    documents,
    background,
    decisionNote: seed.decisionNote ?? '',
    decidedAt: decided ? stageSince : null,
    history: history
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((event, index) => ({ ...event, id: `${draft.id}-event-${index + 1}` })),
  }
}

/** Los guías de la app ya pasaron la verificación hace meses. */
function approvedSeed(guide: AppGuide, index: number): ApplicationSeed {
  const everything = requiredDocuments({ serviceRole: guide.role, hasTransport: guide.hasTransport })
  return {
    id: `app-${guide.id}`,
    name: guide.name,
    city: APP_GUIDE_CITIES[guide.id] ?? 'Granada',
    phone: '',
    serviceRole: guide.role,
    languages: guide.languages,
    specialties: guide.specialties,
    yearsExperience: guide.yearsExperience,
    hasTransport: guide.hasTransport,
    bio: guide.bio,
    references: [],
    submittedDaysAgo: 110 + index * 9,
    stageDaysAgo: 104 + index * 9,
    stage: 'decision',
    status: 'approved',
    assigneeId: index % 2 === 0 ? 'user-raquel' : 'user-daniela',
    documents: Object.fromEntries(everything.map((type) => [type, 'accepted'])),
    checks: { policia: 'clear', intur: 'clear', referencias: 'clear' },
    notes: {},
  }
}

export function seedPeople(today: ISODate): { users: User[]; guideApplications: GuideApplication[] } {
  const random = createRandom(hashSeed(`kplan-people:${today}`))
  const staff = new Map(catalog.users.filter((user) => user.role === 'admin').map((user) => [user.id, user.name]))

  const portalUsers: User[] = catalog.users.map(({ createdDaysAgo, seenDaysAgo, ...user }) => ({
    ...user,
    serviceRole: null,
    createdAt: addDays(today, -createdDaysAgo),
    lastSeenAt: seenDaysAgo === null ? null : moment(today, seenDaysAgo, random.int(8, 17) * HOUR + random.int(0, 59)),
  }))

  const drafts: ApplicationDraft[] = [
    ...catalog.appGuides.map((guide, index) => {
      const seed = approvedSeed(guide, index)
      return {
        id: seed.id,
        userId: `user-${guide.id}`,
        name: guide.name,
        email: emailFor(guide.name),
        phone: phone(random),
        city: seed.city,
        photoUrl: guide.photoUrl,
        seed,
        reviewerId: seed.assigneeId ?? 'user-daniela',
      }
    }),
    ...catalog.guideApplications.map((seed) => ({
      id: seed.id,
      userId: `user-${seed.id.replace(/^app-/, '')}`,
      name: seed.name,
      email: emailFor(seed.name),
      phone: seed.phone,
      city: seed.city,
      photoUrl: `https://picsum.photos/seed/${seed.id}/300/300`,
      seed,
      reviewerId: 'user-daniela',
    })),
  ]

  const guideApplications = drafts.map((draft) => buildApplication(draft, today, staff))

  const guideUsers: User[] = drafts.map((draft) => ({
    id: draft.userId,
    name: draft.name,
    email: draft.email,
    role: 'guia',
    organizationId: null,
    staffRoleId: null,
    serviceRole: draft.seed.serviceRole,
    status: 'active',
    phone: draft.phone,
    city: draft.city,
    createdAt: addDays(today, -(draft.seed.submittedDaysAgo + 1)),
    lastSeenAt: moment(today, random.int(0, 6), random.int(7, 20) * HOUR + random.int(0, 59)),
  }))

  return { users: [...portalUsers, ...guideUsers, ...seedTourists(today)], guideApplications }
}

const TOURIST_FIRST = [
  'María', 'José', 'Andrea', 'Carlos', 'Sofía', 'Luis', 'Valeria', 'Diego', 'Emily', 'John', 'Sarah', 'Lukas',
  'Camille', 'Marco', 'Hannah', 'Pedro', 'Fernanda', 'Kevin', 'Laura', 'Tomás', 'Chloé', 'Matteo', 'Olivia', 'Noah',
]
const TOURIST_LAST = [
  'González', 'Hernández', 'López', 'Martínez', 'Rodríguez', 'Morales', 'Castro', 'Vega', 'Smith', 'Johnson',
  'Müller', 'Dubois', 'Rossi', 'Brown', 'Silva', 'Reyes', 'Navarro', 'Weber', 'Taylor', 'Mora',
]

function seedTourists(today: ISODate): User[] {
  const random = createRandom(hashSeed(`kplan-tourists:${today}`))
  const used = new Map<string, number>()
  return Array.from({ length: 48 }, (_, index) => {
    const name = `${random.pick(TOURIST_FIRST)} ${random.pick(TOURIST_LAST)}`
    const count = used.get(name) ?? 0
    used.set(name, count + 1)
    const createdDaysAgo = random.int(1, 200)
    return {
      id: `user-turista-${index + 1}`,
      name,
      email: emailFor(name, count),
      role: 'turista' as const,
      organizationId: null,
      staffRoleId: null,
      serviceRole: null,
      status: index === 7 || index === 31 ? ('suspended' as const) : ('active' as const),
      phone: random.chance(0.6) ? phone(random) : '',
      city: random.pick(CITIES).name,
      createdAt: addDays(today, -createdDaysAgo),
      lastSeenAt: moment(today, random.int(0, Math.min(createdDaysAgo, 45)), random.int(7, 21) * HOUR + random.int(0, 59)),
    }
  })
}
