import { nowLocalDateTime, todayISO } from '@/lib/dates'
import { formatMoney, lowerFirst } from '@/lib/format'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import {
  admissionBlocker,
  ORGANIZATION_DOCUMENT_INFO,
  ORGANIZATION_DOCUMENT_RULES,
  readinessGaps,
  resubmitBlocker,
  type AssistedApplicationInput,
  type Organization,
  type OrganizationApplication,
  type OrganizationApplicationInput,
  type Stop,
  type User,
} from '../../models'
import { assignSchema, changesRequestSchema, decisionSchema, documentReviewSchema } from '../../schemas/guide.schema'
import {
  documentReplaceSchema,
  normalizeRuc,
  parseApplication,
  parseAssistedApplication,
} from '../../schemas/organization-application.schema'
import type { MockDatabase } from '../db'
import { fail, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission, toSessionUser } from '../services/access'
import { assertStopFree, ownerOf } from '../services/ownership'
import { readinessOf, withNewPlaceReadiness } from '../services/readiness'
import { claimReview, logReview } from '../services/review'

const REVIEWERS = ['organizations.review', 'organizations.manage'] as const

function findApplication(db: MockDatabase, applicationId: string): OrganizationApplication {
  const application = db.organizationApplications.find((item) => item.id === applicationId)
  if (!application) throw fail.notFound('No encontramos esa solicitud')
  return application
}

const isOwner = (user: User, application: OrganizationApplication) =>
  application.userId === user.id || (!!user.organizationId && application.organizationId === user.organizationId)

/** La solicitud de quien entró; si se postuló más de una vez, la última. */
function ownApplication(db: MockDatabase, user: User): OrganizationApplication {
  const own = db.organizationApplications
    .filter((item) => isOwner(user, item))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
  if (!own) throw fail.notFound('No tienes una solicitud')
  return own
}

/** Lo que ve quien se postuló: sin asignaciones internas ni nombres del equipo. */
function forApplicant(db: MockDatabase, application: OrganizationApplication): OrganizationApplication {
  return {
    ...withNewPlaceReadiness(db, application),
    assigneeId: null,
    assisted: application.assisted && { ...application.assisted, byId: 'equipo', byName: "Equipo K'Plan" },
    documents: application.documents.map((document) => ({ ...document, reviewedBy: null })),
    history: application.history
      .filter((event) => event.kind !== 'assigned')
      .map((event) => (event.actorId === null ? event : { ...event, actorId: 'equipo', actorName: "Equipo K'Plan" })),
  }
}

/** Quien llenó un alta asistida no la revisa ni la decide: la ve otra persona del equipo. */
function assertNotFiller(application: OrganizationApplication, actor: User) {
  if (application.assisted?.byId === actor.id) throw fail.conflict('La llenaste tú: la revisa y la decide otra persona del equipo')
}

/** Una acción del equipo sobre una solicitud: la busca, la valida y devuelve la solicitud actualizada. */
function act(handler: (application: OrganizationApplication, actor: User, context: MockContext) => void) {
  return (context: MockContext) => {
    const actor = requireUser(context)
    const application = findApplication(context.db, context.params.id)
    handler(application, actor, context)
    return withNewPlaceReadiness(context.db, application)
  }
}

function assertInReview(application: OrganizationApplication, stage?: OrganizationApplication['stage']) {
  if (application.status !== 'in_review') throw fail.conflict('Esta solicitud no está en revisión')
  if (stage && application.stage !== stage) throw fail.conflict('La solicitud ya pasó de etapa: recarga la página')
}

/**
 * Crea la cuenta, la organización en revisión, el borrador de su lugar y la
 * solicitud. En un alta asistida la cuenta queda invitada: la persona crea su
 * contraseña con el correo que le llega.
 */
function createApplication(
  db: MockDatabase,
  input: Omit<OrganizationApplicationInput, 'password'>,
  assistedBy: User | null = null,
  fee = 0,
) {
  const now = nowLocalDateTime()
  const today = todayISO()
  const email = input.representative.email.trim().toLowerCase()
  if (db.users.some((user) => user.email.toLowerCase() === email)) {
    throw fail.invalid('Revisa el correo', { 'representative.email': 'Ya hay una cuenta con este correo: entra con ella' })
  }
  for (const stopId of input.claimedStopIds) {
    assertStopFree(db, stopId, { city: input.city, field: 'claimedStopIds' })
  }

  const organizationId = uniqueSlug(`org-${input.name}`, (id) => db.organizations.some((item) => item.id === id))
  const applicationId = uniqueSlug(`orgapp-${input.name}`, (id) => db.organizationApplications.some((item) => item.id === id))
  let draft: Stop | null = null
  if (input.newPlace) {
    const inCity = db.stops.filter((stop) => stop.city === input.city)
    draft = {
      id: uniqueSlug(`${input.city}-${input.newPlace.name}`, (id) => db.stops.some((stop) => stop.id === id)),
      name: input.newPlace.name,
      category: input.newPlace.category,
      city: input.city,
      address: input.newPlace.address,
      duration: '45 min',
      rating: 0,
      reviewsCount: 0,
      hasBadge: false,
      description: input.description,
      tip: '',
      images: [],
      coordinates: inCity[0]?.coordinates ?? { latitude: 12.1328, longitude: -86.2504 },
      draft: true,
    }
    db.stops.push(draft)
  }

  const organization: Organization = {
    id: organizationId,
    type: input.type,
    name: input.name,
    kind: input.type === 'alcaldia' ? 'Alcaldía municipal' : input.kind,
    city: input.city,
    stopIds: draft ? [draft.id] : [],
    status: 'pending',
    contactName: input.representative.name,
    contactEmail: email,
    contactPhone: input.representative.phone,
    joinedAt: today,
  }
  const user: User = {
    id: uniqueSlug(`user-${input.name}`, (id) => db.users.some((item) => item.id === id)),
    name: input.representative.name,
    email,
    role: input.type,
    organizationId,
    staffRoleId: null,
    serviceRole: null,
    status: assistedBy ? 'invited' : 'active',
    phone: input.representative.phone,
    city: input.city,
    createdAt: today,
    lastSeenAt: assistedBy ? null : now,
  }
  const application: OrganizationApplication = {
    id: applicationId,
    organizationId,
    userId: user.id,
    type: input.type,
    name: input.name,
    legalName: input.type === 'negocio' ? input.legalName : null,
    ruc: input.type === 'negocio' ? normalizeRuc(input.ruc) : null,
    kind: organization.kind,
    city: input.city,
    address: input.address,
    description: input.description,
    representative: { ...input.representative, email },
    claimedStopIds: input.claimedStopIds,
    newStopId: draft?.id ?? null,
    submittedAt: now,
    stage: 'documents',
    stageSince: now,
    status: 'in_review',
    assigneeId: null,
    documents: input.documents.map((document) => ({
      id: `${applicationId}-${document.type}`,
      type: document.type,
      fileName: document.fileName,
      pages: document.pages,
      number: null,
      detail: null,
      issuedOn: null,
      expiresOn: null,
      uploadedAt: now,
      status: 'pending',
      checks: [],
      note: '',
      reviewedBy: null,
      reviewedAt: null,
    })),
    decisionNote: '',
    decidedAt: null,
    history: [],
    assisted: assistedBy ? { byId: assistedBy.id, byName: assistedBy.name, fee } : null,
  }
  if (assistedBy) {
    logReview(
      application,
      assistedBy,
      'submitted',
      `Llenó la solicitud por ${input.name} con ${input.documents.length} documentos (alta asistida${fee > 0 ? `, se cobra ${formatMoney(fee)} al aprobarla` : ', sin costo'}). Le llegó una invitación a ${email}`,
    )
  } else {
    logReview(application, { id: null, name: user.name }, 'submitted', `Envió la solicitud desde el portal con ${input.documents.length} documentos`)
  }

  db.organizations.push(organization)
  db.users.push(user)
  db.organizationApplications.push(application)
  return { user, application }
}

function invalid(issues: ReturnType<typeof parseApplication>): never {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.join('.')
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message
  }
  throw fail.invalid('Revisa los campos marcados', fieldErrors)
}

export const admissionRoutes = [
  route(
    'POST',
    endpoints.organizationApplications.list,
    ({ db, body }) => {
      const issues = parseApplication(body)
      if (issues.length > 0) invalid(issues)
      const { user } = createApplication(db, body as OrganizationApplicationInput)
      return { token: `demo.${user.id}`, user: toSessionUser(db, user) }
    },
    { isPublic: true },
  ),
  route(
    'POST',
    endpoints.organizationApplications.assisted,
    (context) => {
      const actor = requireUser(context)
      const issues = parseAssistedApplication(context.body)
      if (issues.length > 0) invalid(issues)
      const input = context.body as AssistedApplicationInput
      return createApplication(context.db, input, actor, input.charge ? context.db.pricing.assistedOnboardingFee : 0).application
    },
    { permissions: [...REVIEWERS] },
  ),
  route('GET', endpoints.organizationApplications.mine, (context) => forApplicant(context.db, ownApplication(context.db, requireUser(context)))),
  route(
    'GET',
    endpoints.organizationApplications.list,
    ({ db, query }) => {
      const status = query.get('status')
      return db.organizationApplications
        .filter((item) => !status || item.status === status)
        .sort((a, b) => a.stageSince.localeCompare(b.stageSince))
        .map((item) => withNewPlaceReadiness(db, item))
    },
    { permissions: [...REVIEWERS] },
  ),
  route(
    'GET',
    endpoints.organizationApplications.reviewers,
    ({ db }) =>
      db.users
        .filter((user) => user.role === 'admin' && hasPermission(db, user, REVIEWERS))
        .map((user) => ({ id: user.id, name: user.name, canDecide: true }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    { permissions: [...REVIEWERS] },
  ),
  route('GET', endpoints.organizationApplications.detail(':id'), (context) => {
    const user = requireUser(context)
    const application = findApplication(context.db, context.params.id)
    if (hasPermission(context.db, user, REVIEWERS)) return withNewPlaceReadiness(context.db, application)
    if (isOwner(user, application)) return forApplicant(context.db, application)
    throw fail.notFound('No encontramos esa solicitud')
  }),

  // Quien se postuló
  route('POST', endpoints.organizationApplications.documents(':id'), (context) => {
    const user = requireUser(context)
    const application = findApplication(context.db, context.params.id)
    if (!isOwner(user, application)) throw fail.forbidden()
    const open = application.status === 'changes_requested' || (application.status === 'in_review' && application.stage === 'documents')
    if (!open) throw fail.conflict('Tu solicitud ya no recibe documentos')
    const input = parseBody(documentReplaceSchema, context.body)
    const rules = ORGANIZATION_DOCUMENT_RULES[application.type]
    if (![...rules.required, ...rules.optional].includes(input.type)) throw fail.invalid('Ese documento no aplica a tu solicitud')
    const now = nowLocalDateTime()
    const fresh = {
      fileName: input.fileName,
      pages: input.pages,
      uploadedAt: now,
      status: 'pending' as const,
      checks: [],
      note: '',
      reviewedBy: null,
      reviewedAt: null,
    }
    const existing = application.documents.find((document) => document.type === input.type)
    if (existing) Object.assign(existing, fresh)
    else {
      application.documents.push({ id: `${application.id}-${input.type}`, type: input.type, number: null, detail: null, issuedOn: null, expiresOn: null, ...fresh })
    }
    const label = lowerFirst(ORGANIZATION_DOCUMENT_INFO[input.type].label)
    logReview(application, { id: null, name: user.name }, 'document_replaced', existing ? `Subió de nuevo: ${label}` : `Subió ${label}`)
    return forApplicant(context.db, application)
  }),
  route('POST', endpoints.organizationApplications.resubmit(':id'), (context) => {
    const user = requireUser(context)
    const application = findApplication(context.db, context.params.id)
    if (!isOwner(user, application)) throw fail.forbidden()
    const blocker = resubmitBlocker(application)
    if (blocker) throw fail.conflict(blocker)
    application.status = 'in_review'
    application.stage = 'documents'
    application.stageSince = nowLocalDateTime()
    logReview(application, { id: null, name: user.name }, 'resubmitted', 'Mandó de nuevo la solicitud con las correcciones')
    return forApplicant(context.db, application)
  }),

  // Equipo de K'Plan
  route(
    'POST',
    endpoints.organizationApplications.assign(':id'),
    act((application, actor, { db, body }) => {
      const { assigneeId } = parseBody(assignSchema, body)
      if (assigneeId === application.assigneeId) return
      if (assigneeId === null) {
        application.assigneeId = null
        logReview(application, actor, 'assigned', 'Dejó la solicitud sin responsable')
        return
      }
      const assignee = db.users.find((item) => item.id === assigneeId)
      if (!assignee || !hasPermission(db, assignee, REVIEWERS)) throw fail.invalid('Esa persona no revisa solicitudes de organizaciones')
      if (application.assisted?.byId === assignee.id) throw fail.invalid(`${assignee.name} la llenó: asígnala a otra persona del equipo`)
      application.assigneeId = assignee.id
      logReview(application, actor, 'assigned', assignee.id === actor.id ? `${actor.name} tomó la solicitud` : `Se la asignó a ${assignee.name}`)
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.organizationApplications.review(':id', ':documentId'),
    act((application, actor, { params, body }) => {
      assertInReview(application, 'documents')
      assertNotFiller(application, actor)
      const document = application.documents.find((item) => item.id === params.documentId)
      if (!document) throw fail.notFound('No encontramos ese documento')
      const input = parseBody(documentReviewSchema, body)
      const info = ORGANIZATION_DOCUMENT_INFO[document.type]
      const checks = info.checks.map((check) => check.id).filter((id) => input.checks.includes(id))
      if (input.status === 'accepted' && checks.length < info.checks.length) throw fail.invalid('Marca todo lo que revisaste antes de aceptarlo')
      claimReview(application, actor)
      Object.assign(document, {
        status: input.status,
        checks,
        note: input.status === 'rejected' ? input.note : '',
        reviewedBy: actor.id,
        reviewedAt: nowLocalDateTime(),
      })
      logReview(
        application,
        actor,
        input.status === 'accepted' ? 'document_accepted' : 'document_rejected',
        input.status === 'accepted' ? `Aceptó: ${lowerFirst(info.label)}` : `Rechazó: ${lowerFirst(info.label)}. ${input.note}`,
      )
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.organizationApplications.advance(':id'),
    act((application, actor) => {
      assertNotFiller(application, actor)
      const blocker = admissionBlocker(application)
      if (blocker) throw fail.conflict(blocker)
      claimReview(application, actor)
      application.stage = 'decision'
      application.stageSince = nowLocalDateTime()
      logReview(application, actor, 'stage', 'Pasó a decisión')
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.organizationApplications.requestChanges(':id'),
    act((application, actor, { body }) => {
      assertInReview(application, 'documents')
      const { note } = parseBody(changesRequestSchema, body)
      claimReview(application, actor)
      application.status = 'changes_requested'
      application.stageSince = nowLocalDateTime()
      logReview(application, actor, 'changes_requested', `Pidió una corrección: ${note}`)
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.organizationApplications.decision(':id'),
    act((application, actor, { db, body }) => {
      assertInReview(application, 'decision')
      assertNotFiller(application, actor)
      const input = parseBody(decisionSchema, body)
      const organization = db.organizations.find((item) => item.id === application.organizationId)
      if (!organization) throw fail.notFound('No encontramos la organización de esta solicitud')

      if (input.decision === 'approved') {
        const taken = application.claimedStopIds.filter((stopId) => {
          const owner = ownerOf(db, stopId)
          return owner && owner.id !== organization.id
        })
        if (taken.length > 0) {
          const stop = db.stops.find((item) => item.id === taken[0])
          throw fail.conflict(`${stop?.name ?? 'Un lugar'} ya lo administra ${ownerOf(db, taken[0])?.name}: resuélvelo antes de aprobar`)
        }
        const draft = db.stops.find((item) => item.id === application.newStopId && item.draft)
        const gaps = draft ? readinessGaps(readinessOf(db, draft)) : []
        if (draft && gaps.length > 0) throw fail.conflict(`Antes de aprobarla, a ${draft.name} le falta ${gaps.join(' y ')}`)
        organization.status = 'active'
        organization.stopIds = [...new Set([...organization.stopIds, ...application.claimedStopIds])]
        for (const stop of db.stops) {
          if (organization.stopIds.includes(stop.id) && stop.draft) delete stop.draft
        }
      } else {
        organization.status = 'suspended'
      }
      application.status = input.decision
      application.decisionNote = input.note
      application.decidedAt = nowLocalDateTime()
      application.stageSince = application.decidedAt
      logReview(
        application,
        actor,
        input.decision,
        input.decision === 'approved' ? `Aprobó la solicitud${input.note ? `: ${input.note}` : ''}` : `Rechazó la solicitud: ${input.note}`,
      )
    }),
    { permissions: [...REVIEWERS] },
  ),
]

/** Para el login: por qué no entra una organización rechazada. */
export function rejectionNote(db: MockDatabase, organizationId: string): string | null {
  const rejected = db.organizationApplications
    .filter((item) => item.organizationId === organizationId && item.status === 'rejected')
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
  return rejected ? rejected.decisionNote : null
}