/**
 * La cola de verificación del equipo (F3) en el backend de demo: el mismo formato y las mismas reglas que el
 * API (docs/organizaciones.md del repo del API). Trabaja sobre los expedientes de `db.applications`.
 */
import { z } from 'zod'
import { endpoints } from '../../api/endpoints'
import type { User } from '../../models'
import type { MockDatabase } from '../db'
import { fail, MockHttpError, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'
import { REJECTION_REASONS } from '../services/application-catalog'
import { instantNow, OPEN_STATUSES, wireQueueDetail, wireQueueItem, type MockApplication } from '../services/applications'

const VIEWERS = ['organizations.view'] as const
const REVIEWERS = ['organizations.review', 'organizations.manage'] as const
const MANAGERS = ['organizations.manage'] as const

const DEFAULT_PAGE_SIZE = 20

function find(db: MockDatabase, requestId: string): MockApplication {
  const found = db.applications.find((item) => item.id === requestId)
  if (!found) throw fail.notFound('No encontramos esa solicitud.')
  return found
}

function ensureOpen(application: MockApplication) {
  if (!OPEN_STATUSES.includes(application.status)) throw fail.conflict('Esta solicitud ya se resolvió.')
}

/** Tomar no le quita a otra persona lo que ya tiene en revisión; decidir sin tomar antes la toma. */
function ensureNotHeldByOther(db: MockDatabase, application: MockApplication, actor: User, canManage: boolean) {
  const holder = db.users.find((user) => user.id === application.takenById)
  if (holder && holder.id !== actor.id && !canManage) throw fail.conflict(`${holder.name} ya tiene esta solicitud en revisión.`)
}

/** Una acción del equipo sobre un expediente: lo busca y devuelve el expediente como queda. */
function act(handler: (application: MockApplication, actor: User, context: MockContext) => void) {
  return (context: MockContext) => {
    const actor = requireUser(context)
    const application = find(context.db, context.params.id)
    handler(application, actor, context)
    return wireQueueDetail(context.db, application)
  }
}

const rejectBody = z.object({ reason: z.string().min(1).max(60), note: z.string().max(1000).default('') })
const approveBody = z.object({ note: z.string().max(1000).default('') })

function invalid(field: string, message: string) {
  return new MockHttpError(400, 'Revisa los campos marcados', { [field]: message })
}

export const verificationRoutes = [
  route(
    'GET',
    endpoints.verificationRequest.list,
    ({ db, query }) => {
      const status = query.get('status') ?? 'open'
      const kind = query.get('kind')
      const pageSize = Math.min(100, Math.max(1, Number(query.get('page_size')) || DEFAULT_PAGE_SIZE))
      const requested = Math.max(1, Number(query.get('page')) || 1)

      const shown = db.applications
        .filter((item) => (status === 'all' ? true : status === 'open' ? OPEN_STATUSES.includes(item.status) : item.status === status))
        .filter((item) => !kind || item.data.kind === kind)
      // La bandeja se atiende por orden de llegada; lo cerrado, lo más reciente primero.
      const open = status === 'open' || status === 'submitted' || status === 'in_review'
      shown.sort((a, b) => (open ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt)))

      const pages = Math.max(1, Math.ceil(shown.length / pageSize))
      return {
        next: requested < pages,
        previous: requested > 1,
        elements: shown.length,
        pages,
        current: requested,
        results: shown.slice((requested - 1) * pageSize, requested * pageSize).map((item) => wireQueueItem(db, item)),
      }
    },
    { permissions: [...VIEWERS] },
  ),
  // Antes que el detalle: `reason` no es un id.
  route(
    'GET',
    endpoints.verificationRequest.reasons,
    () => REJECTION_REASONS.map((item) => ({ code: item.code, label: item.label, requires_text: item.requiresText })),
    { permissions: [...VIEWERS, ...REVIEWERS] },
  ),
  route(
    'GET',
    endpoints.verificationRequest.detail(':id'),
    ({ db, params }) => wireQueueDetail(db, find(db, params.id)),
    { permissions: [...VIEWERS] },
  ),

  route(
    'POST',
    endpoints.verificationRequest.take(':id'),
    act((application, actor, { db }) => {
      ensureOpen(application)
      ensureNotHeldByOther(db, application, actor, false)
      application.status = 'in_review'
      application.takenById = actor.id
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.verificationRequest.release(':id'),
    act((application, actor, { db }) => {
      ensureOpen(application)
      if (!application.takenById) throw fail.conflict('Esta solicitud no está en revisión.')
      if (application.takenById !== actor.id && !hasPermission(db, actor, MANAGERS)) {
        throw fail.forbidden()
      }
      application.status = 'submitted'
      application.takenById = null
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.verificationRequest.approve(':id'),
    act((application, actor, { db, body }) => {
      const { note } = parseBody(approveBody, body ?? {})
      ensureOpen(application)
      ensureNotHeldByOther(db, application, actor, hasPermission(db, actor, MANAGERS))
      application.status = 'approved'
      application.takenById = actor.id
      application.resolvedAt = instantNow()
      application.resolution = { approved: true, reasonCode: null, note: note.trim() }
      // Aprobar es lo que hace visible a la organización.
      const organization = db.organizations.find((item) => item.id === application.organizationId)
      if (organization) organization.status = 'active'
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.verificationRequest.reject(':id'),
    act((application, actor, { db, body }) => {
      const input = parseBody(rejectBody, body)
      const reason = REJECTION_REASONS.find((item) => item.code === input.reason)
      if (!reason) throw invalid('reason', 'Ese motivo no se ofrece para rechazar.')
      if (reason.requiresText && !input.note.trim()) throw invalid('note', 'Con ese motivo hay que explicarle a la persona qué pasó.')
      ensureOpen(application)
      ensureNotHeldByOther(db, application, actor, hasPermission(db, actor, MANAGERS))
      application.status = 'rejected'
      application.takenById = actor.id
      application.resolvedAt = instantNow()
      application.resolution = { approved: false, reasonCode: reason.code, note: input.note.trim() }
    }),
    { permissions: [...REVIEWERS] },
  ),
]
