import { nowLocalDateTime } from '@/lib/dates'
import { lowerFirst } from '@/lib/format'
import { endpoints } from '../../api/endpoints'
import {
  advanceBlocker,
  BACKGROUND_CHECK_INFO,
  DOCUMENT_TYPE_INFO,
  requiredChecks,
  VERIFICATION_STAGES,
  type ApplicationStatus,
  type BackgroundCheckType,
  type GuideApplication,
  type ReviewEvent,
  type User,
} from '../../models'
import {
  assignSchema,
  backgroundCheckSchema,
  changesRequestSchema,
  decisionSchema,
  documentReviewSchema,
} from '../../schemas/guide.schema'
import type { MockDatabase } from '../db'
import { fail, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'
import { claimReview, logReview } from '../services/review'

function findApplication(db: MockDatabase, applicationId: string): GuideApplication {
  const application = db.guideApplications.find((item) => item.id === applicationId)
  if (!application) throw fail.notFound('No encontramos esa solicitud')
  return application
}

const log = (application: GuideApplication, actor: User, kind: ReviewEvent['kind'], text: string) =>
  logReview(application, actor, kind, text)
const claim = claimReview

function assertInReview(application: GuideApplication, stage?: GuideApplication['stage']) {
  if (application.status !== 'in_review') throw fail.conflict('Esta solicitud no está en revisión')
  if (stage && application.stage !== stage) throw fail.conflict('La solicitud ya pasó de etapa: recarga la página')
}

/** Cada acción sobre una solicitud: la busca, la valida y devuelve la solicitud actualizada. */
function act(handler: (application: GuideApplication, actor: User, context: MockContext) => void) {
  return (context: MockContext) => {
    const actor = requireUser(context)
    const application = findApplication(context.db, context.params.id)
    handler(application, actor, context)
    return application
  }
}

const REVIEWERS = ['guides.review', 'guides.decide'] as const
const VIEWERS = ['guides.view'] as const

export const guideRoutes = [
  route(
    'GET',
    endpoints.guideApplications.list,
    ({ db, query }) => {
      const status = query.get('status') as ApplicationStatus | null
      return db.guideApplications
        .filter((item) => !status || item.status === status)
        .sort((a, b) => a.stageSince.localeCompare(b.stageSince))
    },
    { permissions: [...VIEWERS] },
  ),
  route(
    'GET',
    endpoints.guideApplications.reviewers,
    ({ db }) =>
      db.users
        .filter((user) => user.role === 'admin' && hasPermission(db, user, REVIEWERS))
        .map((user) => ({ id: user.id, name: user.name, canDecide: hasPermission(db, user, ['guides.decide']) }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    { permissions: [...VIEWERS] },
  ),
  route('GET', endpoints.guideApplications.detail(':id'), ({ db, params }) => findApplication(db, params.id), {
    permissions: [...VIEWERS],
  }),
  route(
    'POST',
    endpoints.guideApplications.assign(':id'),
    act((application, actor, { db, body }) => {
      const { assigneeId } = parseBody(assignSchema, body)
      if (assigneeId === application.assigneeId) return
      if (assigneeId === null) {
        application.assigneeId = null
        log(application, actor, 'assigned', 'Dejó la solicitud sin responsable')
        return
      }
      const assignee = db.users.find((item) => item.id === assigneeId)
      if (!assignee || !hasPermission(db, assignee, REVIEWERS)) {
        throw fail.invalid('Esa persona no revisa solicitudes de guías')
      }
      application.assigneeId = assignee.id
      log(application, actor, 'assigned', assignee.id === actor.id ? `${actor.name} tomó la solicitud` : `Se la asignó a ${assignee.name}`)
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.guideApplications.document(':id', ':documentId'),
    act((application, actor, { params, body }) => {
      assertInReview(application, 'documents')
      const document = application.documents.find((item) => item.id === params.documentId)
      if (!document) throw fail.notFound('No encontramos ese documento')
      const input = parseBody(documentReviewSchema, body)
      const info = DOCUMENT_TYPE_INFO[document.type]
      const checks = info.checks.map((check) => check.id).filter((id) => input.checks.includes(id))
      if (input.status === 'accepted' && checks.length < info.checks.length) {
        throw fail.invalid('Marca todo lo que revisaste antes de aceptarlo')
      }
      claim(application, actor)
      Object.assign(document, {
        status: input.status,
        checks,
        note: input.status === 'rejected' ? input.note : '',
        reviewedBy: actor.id,
        reviewedAt: nowLocalDateTime(),
      })
      log(
        application,
        actor,
        input.status === 'accepted' ? 'document_accepted' : 'document_rejected',
        input.status === 'accepted'
          ? `Aceptó: ${lowerFirst(info.label)}`
          : `Rechazó: ${lowerFirst(info.label)}. ${input.note}`,
      )
    }),
    { permissions: ['guides.review'] },
  ),
  route(
    'POST',
    endpoints.guideApplications.check(':id', ':checkType'),
    act((application, actor, { params, body }) => {
      assertInReview(application, 'background')
      const type = params.checkType as BackgroundCheckType
      if (!requiredChecks(application).includes(type)) throw fail.notFound('Esa verificación no aplica a esta solicitud')
      const input = parseBody(backgroundCheckSchema, body)
      claim(application, actor)
      const check = application.background.find((item) => item.type === type)
      const next = { type, status: input.status, note: input.note, checkedBy: actor.id, checkedAt: nowLocalDateTime() }
      if (check) Object.assign(check, next)
      else application.background.push(next)
      const label = lowerFirst(BACKGROUND_CHECK_INFO[type].label)
      log(
        application,
        actor,
        input.status === 'clear' ? 'check_clear' : 'check_flagged',
        input.status === 'clear' ? `Verificó ${label}: sin problemas` : `Verificó ${label}: ${input.note}`,
      )
    }),
    { permissions: ['guides.review'] },
  ),
  route(
    'POST',
    endpoints.guideApplications.advance(':id'),
    act((application, actor) => {
      const blocker = advanceBlocker(application)
      if (blocker) throw fail.conflict(blocker)
      const next = VERIFICATION_STAGES[VERIFICATION_STAGES.indexOf(application.stage) + 1]
      claim(application, actor)
      application.stage = next
      application.stageSince = nowLocalDateTime()
      log(application, actor, 'stage', next === 'background' ? 'Pasó a antecedentes' : 'Pasó a decisión')
    }),
    { permissions: ['guides.review'] },
  ),
  route(
    'POST',
    endpoints.guideApplications.requestChanges(':id'),
    act((application, actor, { body }) => {
      assertInReview(application)
      if (application.stage === 'decision') throw fail.conflict('En la decisión ya no se piden correcciones: aprueba o rechaza')
      const { note } = parseBody(changesRequestSchema, body)
      claim(application, actor)
      application.status = 'changes_requested'
      application.stageSince = nowLocalDateTime()
      log(application, actor, 'changes_requested', `Pidió una corrección: ${note}`)
    }),
    { permissions: ['guides.review'] },
  ),
  route(
    'POST',
    endpoints.guideApplications.decision(':id'),
    act((application, actor, { body }) => {
      assertInReview(application, 'decision')
      const input = parseBody(decisionSchema, body)
      application.status = input.decision
      application.decisionNote = input.note
      application.decidedAt = nowLocalDateTime()
      application.stageSince = application.decidedAt
      log(
        application,
        actor,
        input.decision,
        input.decision === 'approved'
          ? `Aprobó la solicitud${input.note ? `: ${input.note}` : ''}`
          : `Rechazó la solicitud: ${input.note}`,
      )
    }),
    { permissions: ['guides.decide'] },
  ),
]
