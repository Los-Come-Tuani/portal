import type { DayHours, OrganizationKind, RequestResolution, RequestStatus } from './application'

/**
 * La cola de verificación del equipo (F3): una sola bandeja para comercios, instituciones
 * culturales y alcaldías, que se atiende por orden de llegada. Es lo que publica el API en
 * `/verification-request/` (docs/organizaciones.md del repo del API).
 */

/** `open` es la bandeja (enviadas y en revisión); `all` trae todo. */
export type QueueStatus = 'open' | RequestStatus | 'all'

export const QUEUE_TABS: { value: QueueStatus; label: string }[] = [
  { value: 'open', label: 'Abiertas' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'all', label: 'Todas' },
]

export interface QueueFilters {
  status?: QueueStatus
  kind?: OrganizationKind
  page?: number
  pageSize?: number
}

export interface Page<T> {
  results: T[]
  /** La página en que se está y cuántas hay. */
  current: number
  pages: number
  /** Cuántos elementos hay en total, no solo en esta página. */
  elements: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface PersonRef {
  id: string
  name: string
  email: string
}

export interface CityRef {
  id: string
  code: string
  name: string
}

export interface OptionRef {
  code: string
  label: string
}

/** Una fila de la bandeja. */
export interface RequestSummary {
  id: string
  kind: OrganizationKind
  organizationId: string
  organizationName: string
  city: CityRef
  status: RequestStatus
  /** Se atiende por orden de llegada. */
  submittedAt: string
  resolvedAt: string | null
  /** Quién la tiene en revisión. */
  takenBy: PersonRef | null
}

export interface BusinessDetail {
  businessType: OptionRef
  ruc: string
  address: string
  phone: string
  alternatePhone: string
  latitude: number
  longitude: number
  hours: DayHours[]
  signatureDish: { name: string; description: string; referencePrice: number; currency: string } | null
}

export interface InstitutionDetail {
  institutionType: OptionRef
  contactEmail: string
  phone: string
}

export interface MunicipalityDetail {
  contactEmail: string
  phone: string
}

export interface RequestDocument {
  kind: 'legal_document' | 'signature_dish_photo'
  /** Una URL de lectura que vence en minutos; `null` si el almacenamiento no está configurado. */
  url: string | null
}

export const DOCUMENT_LABELS: Record<RequestDocument['kind'], string> = {
  legal_document: 'Documento legal',
  signature_dish_photo: 'Foto del platillo estrella',
}

/** Un expediente anterior de la misma organización: cuántas veces se intentó y por qué falló cada una. */
export interface RequestHistoryItem {
  id: string
  status: RequestStatus
  submittedAt: string
  resolvedAt: string | null
  reason: { code: string; label: string } | null
  note: string
}

export interface RequestDetail extends RequestSummary {
  /** Quien se postuló (el primer operador de la organización). */
  applicant: PersonRef | null
  business: BusinessDetail | null
  institution: InstitutionDetail | null
  municipality: MunicipalityDetail | null
  documents: RequestDocument[]
  resolution: RequestResolution | null
  history: RequestHistoryItem[]
}

/** Un motivo de los que se ofrecen al rechazar; con «otro» hay que explicar. */
export interface RejectionReason {
  code: string
  label: string
  requiresText: boolean
}

export interface RejectInput {
  reason: string
  note: string
}

/** Si el equipo todavía puede decidir sobre el expediente. */
export function isDecidable(request: Pick<RequestSummary, 'status'>): boolean {
  return request.status === 'submitted' || request.status === 'in_review'
}
