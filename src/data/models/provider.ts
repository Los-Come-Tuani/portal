import type { ISODate } from './common'
import type { RequestResolution, RequestStatus } from './application'
import type { CityRef, OptionRef, PersonRef, QueueStatus, RejectionReason } from './verification'

/**
 * Guías y traductores (F5): la cola del equipo en `/provider-request/` del API
 * (docs/prestadores.md del repo del API). Quien revisa acepta o rechaza cada documento y pide
 * correcciones; quien decide aprueba o rechaza al final. Una renovación se resuelve sola al
 * revisar su documento.
 */

export const SERVICE_CODES = ['guia', 'traductor'] as const
export type ServiceCode = (typeof SERVICE_CODES)[number]

export const SERVICE_LABELS: Record<ServiceCode, string> = {
  guia: 'Guía',
  traductor: 'Traductor',
}

/** "Guía", "Traductor" o "Guía y traductor". */
export function servicesLabel(services: readonly string[]): string {
  if (services.includes('guia') && services.includes('traductor')) return 'Guía y traductor'
  if (services.includes('traductor')) return 'Traductor'
  return 'Guía'
}

export type ProviderStatus = 'unaccredited' | 'in_review' | 'active' | 'suspended'

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  unaccredited: 'Sin acreditar',
  in_review: 'En revisión',
  active: 'Activo',
  suspended: 'Suspendido',
}

export type ProviderProcedure = 'application' | 'renewal'

export const PROCEDURE_LABELS: Record<ProviderProcedure, string> = {
  application: 'Postulación',
  renewal: 'Renovación',
}

/** En qué paso está lo abierto: revisar documentos o decidir. */
export type ProviderStage = 'documents' | 'decision'

export const PROVIDER_STAGE_LABELS: Record<ProviderStage, string> = {
  documents: 'Documentos',
  decision: 'Decisión',
}

export type CredentialStatus = 'uploaded' | 'in_review' | 'approved' | 'rejected' | 'expired' | 'replaced'

export const CREDENTIAL_STATUS_LABELS: Record<CredentialStatus, string> = {
  uploaded: 'Sin revisar',
  in_review: 'En revisión',
  approved: 'En vigor',
  rejected: 'Rechazado',
  expired: 'Vencido',
  replaced: 'Reemplazado',
}

export type LanguageLevel = 'basic' | 'intermediate' | 'advanced' | 'native'

export const LEVEL_LABELS: Record<LanguageLevel, string> = {
  basic: 'Básico',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  native: 'Nativo',
}

export interface DocumentCounts {
  total: number
  accepted: number
  rejected: number
  /** Sin revisar. */
  pending: number
}

/** Lo que dijo quien revisó un documento, antes de que se resuelva el expediente. */
export interface CredentialReview {
  accepted: boolean
  reason: OptionRef | null
  note: string
  reviewedAt: string
}

export interface Credential {
  id: string
  type: OptionRef
  number: string
  issuedOn: ISODate
  expiresOn: ISODate | null
  /** La URL de lectura vence en minutos; `null` si el almacenamiento no está configurado. */
  file: { key: string; url: string | null }
  status: CredentialStatus
  review: CredentialReview | null
  uploadedAt: string
}

export interface RequestCredential extends Credential {
  /** Se le pide por lo que ofrece (o porque lleva turistas). */
  required: boolean
  /** Se subió en este expediente; si no, viene de uno anterior o está en vigor. */
  inThisRequest: boolean
}

/** Una fila de la bandeja. */
export interface ProviderRequestSummary {
  id: string
  procedure: ProviderProcedure
  status: RequestStatus
  /** Nulo cuando ya se resolvió. */
  stage: ProviderStage | null
  applicant: PersonRef
  services: string[]
  /** Nula es todo el país. */
  city: CityRef | null
  submittedAt: string
  resolvedAt: string | null
  takenBy: PersonRef | null
  counts: DocumentCounts
}

export interface ProviderLanguage {
  code: string
  label: string
  level: LanguageLevel
}

export interface ProviderProfile {
  id: string
  status: ProviderStatus
  phone: string
  presentation: string
  photoUrl: string | null
  languages: ProviderLanguage[]
  carriesTourists: boolean
  createdAt: string
  approvedAt: string | null
}

export interface ProviderHistoryItem {
  id: string
  procedure: ProviderProcedure
  status: RequestStatus
  submittedAt: string
  resolvedAt: string | null
  reason: OptionRef | null
  note: string
}

export interface ProviderRequestDetail extends ProviderRequestSummary {
  profile: ProviderProfile
  documents: RequestCredential[]
  /** Los tipos que se le piden y no tienen un documento utilizable. */
  missing: OptionRef[]
  resolution: RequestResolution | null
  history: ProviderHistoryItem[]
}

export interface ProviderReasons {
  /** Al rechazar un documento. */
  document: RejectionReason[]
  /** Al rechazar al prestador en la decisión. */
  decision: RejectionReason[]
}

export interface ProviderQueueFilters {
  status?: QueueStatus
  service?: ServiceCode
  procedure?: ProviderProcedure
  page?: number
  pageSize?: number
}

export interface CredentialReviewInput {
  documentId: string
  accepted: boolean
  /** Al rechazar: un código de la lista `document`. */
  reason?: string
  note: string
}

export function isOpenRequest(request: Pick<ProviderRequestSummary, 'status'>): boolean {
  return request.status === 'submitted' || request.status === 'in_review'
}

/**
 * Lo que quien revisa puede revisar en este expediente: lo que se subió en él o lo que nadie
 * revisó todavía, mientras no se resuelva. Lo aceptado antes pasa tal cual.
 */
export function isReviewable(request: ProviderRequestDetail, document: RequestCredential): boolean {
  return (
    isOpenRequest(request) &&
    (document.inThisRequest || document.review === null) &&
    (document.status === 'uploaded' || document.status === 'in_review')
  )
}
