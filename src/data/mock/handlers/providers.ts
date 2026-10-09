/**
 * La cola de guías y traductores (F5) en el backend de demo: el mismo formato y las mismas reglas
 * que el API (docs/prestadores.md del repo del API). Trabaja sobre `db.providers`.
 */
import { z } from 'zod'
import { todayISO } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import type { User } from '../../models'
import type { MockDatabase } from '../db'
import { fail, MockHttpError, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'
import { CHANGES_REQUESTED, DOCUMENT_REJECTION_REASONS, PROVIDER_REJECTION_REASONS, type MockReason } from '../services/provider-catalog'
import {
  close,
  considered,
  expedienteOf,
  findRequest,
  hold,
  inForceByType,
  instantNow,
  isOpen,
  OPEN,
  putInForce,
  readyToDecide,
  release,
  required,
  wireProviderDetail,
  wireProviderItem,
  type MockProvider,
  type MockProviderRequest,
} from '../services/providers'

const VIEWERS = ['guides.view'] as const
const REVIEWERS = ['guides.review', 'guides.decide'] as const
const DECIDERS = ['guides.decide'] as const

const DEFAULT_PAGE_SIZE = 20

const reviewBody = z.object({
  document_id: z.string().min(1),
  accepted: z.boolean(),
  reason: z.string().min(1).max(60).optional(),
  note: z.string().max(1000).default(''),
})
const noteBody = z.object({ note: z.string().max(1000).default('') })
const rejectBody = z.object({ reason: z.string().min(1).max(60), note: z.string().max(1000).default('') })

function invalid(field: string, message: string) {
  return new MockHttpError(400, 'Revisa los campos marcados', { [field]: message })
}

function offered(reasons: MockReason[], code: string, note: string): MockReason {
  const reason = reasons.find((item) => item.code === code)
  if (!reason) throw invalid('reason', 'Ese motivo no se ofrece aquí.')
  if (reason.requiresText && !note.trim()) throw invalid('note', 'Con ese motivo hay que explicarle a la persona qué pasó.')
  return reason
}

function ensureOpen(request: MockProviderRequest) {
  if (!isOpen(request)) throw fail.conflict('Esta solicitud ya se resolvió.')
}

function ensureApplication(request: MockProviderRequest) {
  if (request.procedure === 'renewal') throw fail.conflict('Una renovación se resuelve al revisar sus documentos.')
}

function ensureNotHeldByOther(db: MockDatabase, request: MockProviderRequest, actor: User) {
  const holder = db.users.find((user) => user.id === request.takenById)
  if (holder && holder.id !== actor.id) throw fail.conflict(`${holder.name} ya tiene esta solicitud en revisión.`)
}

/** Una acción del equipo: busca el expediente y lo devuelve como queda. */
function act(handler: (provider: MockProvider, request: MockProviderRequest, actor: User, context: MockContext) => void) {
  return (context: MockContext) => {
    const actor = requireUser(context)
    const { provider, request } = findRequest(context.db, context.params.id)
    handler(provider, request, actor, context)
    return wireProviderDetail(context.db, provider, request)
  }
}

/** Una renovación no pasa por la decisión: se resuelve sola cuando su último documento queda revisado. */
function settleRenewal(provider: MockProvider, request: MockProviderRequest, actor: User) {
  const uploaded = provider.credentials.filter((item) => item.requestId === request.id)
  if (uploaded.some((item) => item.verdict === null)) return
  const accepted = uploaded.filter((item) => item.verdict === 'accepted')
  const approved = accepted.length === uploaded.length
  putInForce(provider, accepted)
  close(request, actor, uploaded, { approved, reasonCode: approved ? null : CHANGES_REQUESTED.code, note: '' })
  const inForce = inForceByType(provider, todayISO())
  const missing = required(provider).filter((type) => !inForce.has(type.code))
  if (provider.status === 'suspended' && missing.length === 0) provider.status = 'active'
}

export const providerRoutes = [
  route(
    'GET',
    endpoints.providerRequest.list,
    ({ db, query }) => {
      const status = query.get('status') ?? 'open'
      const service = query.get('service')
      const procedure = query.get('procedure')
      const pageSize = Math.min(100, Math.max(1, Number(query.get('page_size')) || DEFAULT_PAGE_SIZE))
      const requested = Math.max(1, Number(query.get('page')) || 1)

      const shown = db.providers
        .flatMap((provider) => provider.requests.map((request) => ({ provider, request })))
        .filter(({ request }) => (status === 'all' ? true : status === 'open' ? OPEN.includes(request.status) : request.status === status))
        .filter(({ provider }) => !service || provider.services.includes(service as MockProvider['services'][number]))
        .filter(({ request }) => !procedure || request.procedure === procedure)
      // La bandeja se atiende por orden de llegada; lo cerrado, lo más reciente primero.
      const open = status === 'open' || status === 'submitted' || status === 'in_review'
      shown.sort((a, b) => (open ? a.request.submittedAt.localeCompare(b.request.submittedAt) : b.request.submittedAt.localeCompare(a.request.submittedAt)))

      const pages = Math.max(1, Math.ceil(shown.length / pageSize))
      return {
        next: requested < pages,
        previous: requested > 1,
        elements: shown.length,
        pages,
        current: requested,
        results: shown.slice((requested - 1) * pageSize, requested * pageSize).map(({ provider, request }) => wireProviderItem(db, provider, request)),
      }
    },
    { permissions: [...VIEWERS] },
  ),
  // Antes que el detalle: `reason` no es un id.
  route(
    'GET',
    endpoints.providerRequest.reasons,
    () => {
      const wire = (items: MockReason[]) => items.map((item) => ({ code: item.code, label: item.label, requires_text: item.requiresText }))
      return { document: wire(DOCUMENT_REJECTION_REASONS), decision: wire(PROVIDER_REJECTION_REASONS) }
    },
    { permissions: [...VIEWERS] },
  ),
  route(
    'GET',
    endpoints.providerRequest.detail(':id'),
    ({ db, params }) => {
      const { provider, request } = findRequest(db, params.id)
      return wireProviderDetail(db, provider, request)
    },
    { permissions: [...VIEWERS] },
  ),

  route(
    'POST',
    endpoints.providerRequest.take(':id'),
    act((provider, request, actor, { db }) => {
      ensureOpen(request)
      ensureNotHeldByOther(db, request, actor)
      hold(provider, request, actor)
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.providerRequest.release(':id'),
    act((provider, request, actor, { db }) => {
      ensureOpen(request)
      if (!request.takenById) throw fail.conflict('Esta solicitud no está en revisión.')
      if (request.takenById !== actor.id && !hasPermission(db, actor, DECIDERS)) throw fail.forbidden()
      release(provider, request)
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.providerRequest.documentReview(':id'),
    act((provider, request, actor, { db, body }) => {
      const input = parseBody(reviewBody, body)
      if (!input.accepted && !input.reason) throw invalid('reason', 'Al rechazar un documento hay que decir por qué.')
      const reason = input.accepted || !input.reason ? null : offered(DOCUMENT_REJECTION_REASONS, input.reason, input.note)
      ensureOpen(request)
      ensureNotHeldByOther(db, request, actor)
      if (!request.takenById) hold(provider, request, actor)

      const document = considered(request, expedienteOf(provider, request)).find((item) => item.id === input.document_id)
      if (!document) throw fail.notFound('Ese documento no es de esta solicitud.')
      if (document.requestId !== request.id && document.verdict !== null) throw fail.conflict('Ese documento ya se aceptó en una solicitud anterior.')

      document.verdict = input.accepted ? 'accepted' : 'rejected'
      document.reasonCode = reason?.code ?? null
      document.note = input.accepted ? '' : input.note.trim()
      document.reviewedAt = instantNow()
      document.status = 'in_review'
      if (request.procedure === 'renewal') settleRenewal(provider, request, actor)
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.providerRequest.requestChanges(':id'),
    act((provider, request, actor, { db, body }) => {
      const { note } = parseBody(noteBody, body ?? {})
      ensureOpen(request)
      ensureApplication(request)
      ensureNotHeldByOther(db, request, actor)
      const documents = considered(request, expedienteOf(provider, request))
      if (!documents.some((item) => item.verdict === 'rejected')) throw fail.conflict('Rechaza al menos un documento antes de pedir correcciones.')
      close(request, actor, documents, { approved: false, reasonCode: CHANGES_REQUESTED.code, note })
      provider.status = 'unaccredited'
    }),
    { permissions: [...REVIEWERS] },
  ),
  route(
    'POST',
    endpoints.providerRequest.approve(':id'),
    act((provider, request, actor, { body }) => {
      const { note } = parseBody(noteBody, body ?? {})
      ensureOpen(request)
      ensureApplication(request)
      const expediente = expedienteOf(provider, request)
      if (!readyToDecide(expediente)) throw fail.conflict('Cada documento que se pide tiene que estar aceptado y vigente antes de aprobar.')
      const documents = considered(request, expediente)
      putInForce(provider, documents)
      close(request, actor, documents, { approved: true, reasonCode: null, note })
      provider.status = 'active'
      provider.approvedAt ??= instantNow()
    }),
    { permissions: [...DECIDERS] },
  ),
  route(
    'POST',
    endpoints.providerRequest.reject(':id'),
    act((provider, request, actor, { body }) => {
      const input = parseBody(rejectBody, body)
      const reason = offered(PROVIDER_REJECTION_REASONS, input.reason, input.note)
      ensureOpen(request)
      ensureApplication(request)
      close(request, actor, considered(request, expedienteOf(provider, request)), { approved: false, reasonCode: reason.code, note: input.note })
      provider.status = 'unaccredited'
    }),
    { permissions: [...DECIDERS] },
  ),
]
