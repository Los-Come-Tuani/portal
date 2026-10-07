/**
 * Guías y traductores (F5) en el backend de demo: lo que guarda la demo y las mismas reglas que
 * el API para revisar en dos pasos (docs/prestadores.md del repo del API).
 */
import { todayISO, type ISODate } from '@/lib/dates'
import type {
  CredentialStatus,
  LanguageLevel,
  ProviderProcedure,
  ProviderStatus,
  RequestStatus,
  ServiceCode,
  User,
} from '../../models'
import type { MockDatabase } from '../db'
import { fail } from '../http'
import { CITIES } from './application-catalog'
import { CREDENTIAL_TYPE_INFO, LANGUAGES, reasonByCode, requiredTypes, type CredentialTypeCode, type MockCredentialType } from './provider-catalog'

export interface MockCredential {
  id: string
  type: CredentialTypeCode
  number: string
  issuedOn: ISODate
  expiresOn: ISODate | null
  /** El "archivo": un escaneo de muestra. */
  fileUrl: string
  status: CredentialStatus
  /** Lo que dijo quien revisó, antes de que se resuelva el expediente. */
  verdict: 'accepted' | 'rejected' | null
  reviewedAt: string | null
  reasonCode: string | null
  note: string
  /** El expediente en el que se subió. */
  requestId: string
  uploadedAt: string
}

export interface MockProviderRequest {
  id: string
  procedure: ProviderProcedure
  status: RequestStatus
  submittedAt: string
  resolvedAt: string | null
  takenById: string | null
  resolution: { approved: boolean; reasonCode: string | null; note: string; resolvedAt: string } | null
}

export interface MockProvider {
  id: string
  /** La cuenta del prestador en `db.users`. */
  userId: string
  name: string
  email: string
  phone: string
  /** Nula es todo el país. */
  cityId: string | null
  services: ServiceCode[]
  presentation: string
  photoUrl: string
  languages: { code: string; level: LanguageLevel }[]
  carriesTourists: boolean
  status: ProviderStatus
  createdAt: string
  approvedAt: string | null
  requests: MockProviderRequest[]
  credentials: MockCredential[]
}

export const OPEN: readonly RequestStatus[] = ['submitted', 'in_review']

export const isOpen = (request: MockProviderRequest) => OPEN.includes(request.status)

export const instantNow = (): string => new Date().toISOString()

const isExpired = (credential: MockCredential, today: ISODate) => credential.expiresOn !== null && credential.expiresOn < today

/** Todavía puede quedar en vigor: no hay que volver a subirlo. */
export const isUsable = (credential: MockCredential, today: ISODate) =>
  ['approved', 'in_review', 'uploaded'].includes(credential.status) && credential.verdict !== 'rejected' && !isExpired(credential, today)

export function findRequest(db: MockDatabase, requestId: string): { provider: MockProvider; request: MockProviderRequest } {
  for (const provider of db.providers) {
    const request = provider.requests.find((item) => item.id === requestId)
    if (request) return { provider, request }
  }
  throw fail.notFound('No encontramos esa solicitud.')
}

export const required = (provider: MockProvider): MockCredentialType[] => requiredTypes(provider.services, provider.carriesTourists)

const order = (code: CredentialTypeCode) => Object.keys(CREDENTIAL_TYPE_INFO).indexOf(code)

/** El más reciente de cada tipo, sin contar lo reemplazado. */
export function latestByType(provider: MockProvider): Map<CredentialTypeCode, MockCredential> {
  const latest = new Map<CredentialTypeCode, MockCredential>()
  for (const item of [...provider.credentials].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))) {
    if (item.status !== 'replaced' && !latest.has(item.type)) latest.set(item.type, item)
  }
  return latest
}

export function inForceByType(provider: MockProvider, today: ISODate): Map<CredentialTypeCode, MockCredential> {
  return new Map(
    provider.credentials
      .filter((item) => item.status === 'approved' && !isExpired(item, today))
      .map((item) => [item.type, item] as const),
  )
}

export interface Expediente {
  documents: { credential: MockCredential; inThisRequest: boolean }[]
  required: MockCredentialType[]
  missing: MockCredentialType[]
}

/** En la postulación, lo vigente de cada tipo; en una renovación, lo que se subió en ella y lo que está en vigor. */
export function expedienteOf(provider: MockProvider, request: MockProviderRequest, today = todayISO()): Expediente {
  const asked = required(provider)
  if (request.procedure === 'renewal') {
    const uploaded = provider.credentials.filter((item) => item.requestId === request.id).sort((a, b) => order(a.type) - order(b.type))
    const inForce = inForceByType(provider, today)
    const renewed = new Set(uploaded.map((item) => item.type))
    return {
      documents: [
        ...uploaded.map((credential) => ({ credential, inThisRequest: true })),
        ...[...inForce.values()].sort((a, b) => order(a.type) - order(b.type)).map((credential) => ({ credential, inThisRequest: false })),
      ],
      required: asked,
      missing: asked.filter((type) => !inForce.has(type.code) && !renewed.has(type.code)),
    }
  }
  const latest = latestByType(provider)
  return {
    documents: [...latest.values()]
      .sort((a, b) => order(a.type) - order(b.type))
      .map((credential) => ({ credential, inThisRequest: credential.requestId === request.id })),
    required: asked,
    missing: asked.filter((type) => {
      const found = latest.get(type.code)
      return !found || found.status === 'rejected' || found.status === 'expired' || isExpired(found, today)
    }),
  }
}

/** Lo que se revisa: en la postulación, lo vigente de cada tipo que se pide; en una renovación, lo que se subió en ella. */
export function considered(request: MockProviderRequest, expediente: Expediente): MockCredential[] {
  if (request.procedure === 'renewal') return expediente.documents.filter((item) => item.inThisRequest).map((item) => item.credential)
  const asked = new Set(expediente.required.map((type) => type.code))
  return expediente.documents.map((item) => item.credential).filter((item) => asked.has(item.type))
}

/** Cada tipo que se pide tiene un documento aceptado y sin vencer. */
export function readyToDecide(expediente: Expediente, today = todayISO()): boolean {
  const byType = new Map(expediente.documents.map((item) => [item.credential.type, item.credential]))
  return expediente.required.every((type) => {
    const found = byType.get(type.code)
    return !!found && found.verdict === 'accepted' && isUsable(found, today)
  })
}

// ── Hacia el formato del API ──────────────────────────────────────────────

function person(db: MockDatabase, userId: string | null) {
  const user = db.users.find((item) => item.id === userId)
  return user ? { id: user.id, name: user.name, email: user.email } : null
}

function wireCity(cityId: string | null) {
  const city = CITIES.find((item) => item.id === cityId)
  return city ? { id: city.id, code: city.code, name: city.name } : null
}

export function wireCredential(item: MockCredential) {
  const info = CREDENTIAL_TYPE_INFO[item.type]
  return {
    id: item.id,
    type: { code: item.type, label: info.label },
    number: item.number,
    issued_on: item.issuedOn,
    expires_on: item.expiresOn,
    file: { key: `provider-document/${item.id}.jpg`, url: item.fileUrl },
    status: item.status,
    review: item.verdict && {
      accepted: item.verdict === 'accepted',
      reason: reasonByCode(item.reasonCode),
      note: item.note,
      reviewed_at: item.reviewedAt ?? item.uploadedAt,
    },
    uploaded_at: item.uploadedAt,
  }
}

export function wireProviderItem(db: MockDatabase, provider: MockProvider, request: MockProviderRequest) {
  const expediente = expedienteOf(provider, request)
  const verdicts = considered(request, expediente).map((item) => item.verdict)
  return {
    id: request.id,
    procedure: request.procedure,
    status: request.status,
    stage: !isOpen(request) ? null : request.procedure === 'application' && readyToDecide(expediente) ? 'decision' : 'documents',
    applicant: { id: provider.userId, name: provider.name, email: provider.email },
    services: provider.services,
    city: wireCity(provider.cityId),
    submitted_at: request.submittedAt,
    resolved_at: request.resolvedAt,
    taken_by: person(db, request.takenById),
    counts: {
      total: verdicts.length,
      accepted: verdicts.filter((verdict) => verdict === 'accepted').length,
      rejected: verdicts.filter((verdict) => verdict === 'rejected').length,
      pending: verdicts.filter((verdict) => verdict === null).length,
    },
  }
}

export function wireProviderDetail(db: MockDatabase, provider: MockProvider, request: MockProviderRequest) {
  const expediente = expedienteOf(provider, request)
  const asked = new Set(expediente.required.map((type) => type.code))
  return {
    ...wireProviderItem(db, provider, request),
    profile: {
      id: provider.id,
      status: provider.status,
      phone: provider.phone,
      presentation: provider.presentation,
      photo: provider.photoUrl ? { key: `provider-photo/${provider.id}.jpg`, url: provider.photoUrl } : null,
      languages: provider.languages.map((item) => ({
        code: item.code,
        label: LANGUAGES.find((language) => language.code === item.code)?.label ?? item.code,
        level: item.level,
      })),
      carries_tourists: provider.carriesTourists,
      created_at: provider.createdAt,
      approved_at: provider.approvedAt,
    },
    documents: expediente.documents.map(({ credential, inThisRequest }) => ({
      ...wireCredential(credential),
      required: asked.has(credential.type),
      in_this_request: inThisRequest,
    })),
    missing: expediente.missing.map((type) => ({ code: type.code, label: type.label })),
    resolution: request.resolution && {
      approved: request.resolution.approved,
      reason: reasonByCode(request.resolution.reasonCode),
      note: request.resolution.note,
      resolved_at: request.resolution.resolvedAt,
    },
    history: provider.requests
      .filter((item) => item.id !== request.id)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((item) => ({
        id: item.id,
        procedure: item.procedure,
        status: item.status,
        submitted_at: item.submittedAt,
        resolved_at: item.resolvedAt,
        reason: reasonByCode(item.resolution?.reasonCode ?? null),
        note: item.resolution?.note ?? '',
      })),
  }
}

// ── Atender el expediente ─────────────────────────────────────────────────

/** Queda en revisión, a su nombre, y sus documentos también. */
export function hold(provider: MockProvider, request: MockProviderRequest, actor: User) {
  request.status = 'in_review'
  request.takenById = actor.id
  for (const item of considered(request, expedienteOf(provider, request))) {
    if (item.status === 'uploaded') item.status = 'in_review'
  }
}

export function release(provider: MockProvider, request: MockProviderRequest) {
  request.status = 'submitted'
  request.takenById = null
  for (const item of considered(request, expedienteOf(provider, request))) {
    if (item.status === 'in_review') item.status = 'uploaded'
  }
}

/** Lo rechazado por quien revisó queda rechazado; lo demás vuelve a «cargada» con su veredicto. */
export function close(request: MockProviderRequest, actor: User, documents: MockCredential[], resolution: { approved: boolean; reasonCode: string | null; note: string }) {
  for (const item of documents) {
    if (item.verdict === 'rejected') item.status = 'rejected'
    else if (item.status === 'in_review') item.status = 'uploaded'
  }
  const now = instantNow()
  request.status = resolution.approved ? 'approved' : 'rejected'
  request.takenById = actor.id
  request.resolvedAt = now
  request.resolution = { ...resolution, note: resolution.note.trim(), resolvedAt: now }
}

/** El aceptado entra en vigor y deja reemplazado al anterior del mismo tipo. */
export function putInForce(provider: MockProvider, documents: MockCredential[]) {
  for (const item of documents) {
    for (const other of provider.credentials) {
      if (other !== item && other.type === item.type && other.status === 'approved') other.status = 'replaced'
    }
    item.status = 'approved'
  }
}
