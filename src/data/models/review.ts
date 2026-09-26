import type { ISODate, LocalDateTime } from './common'

/**
 * Lo común a toda verificación con documentos: guías y traductores, y
 * organizaciones que se postulan. Cada una define sus tipos de documento.
 */

export interface ReviewCheck {
  id: string
  label: string
}

export interface DocumentTypeInfo {
  label: string
  issuer: string
  /** `card`: carné o cédula; `sheet`: constancia o certificado. */
  format: 'card' | 'sheet'
  /** Para quién es obligatorio, en palabras. */
  requiredFor: string
  /** Las caras que se suben por separado; por defecto, un solo archivo. */
  pages?: string[]
  /** Qué se revisa. Aceptarlo exige marcar todo. */
  checks: ReviewCheck[]
}

export const LEGIBLE: ReviewCheck = { id: 'legible', label: 'Se lee completo, sin partes cortadas ni borrosas' }
export const VALID: ReviewCheck = { id: 'vigente', label: 'Está vigente' }
export const UNALTERED: ReviewCheck = { id: 'integro', label: 'No tiene señales de edición o alteración' }

export type DocumentStatus = 'pending' | 'accepted' | 'rejected'

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Por revisar',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
}

/** Una página o cara del archivo que subieron: la cédula trae frente y reverso. */
export interface DocumentPage {
  label: string
  url: string
}

export interface ReviewDocument<T extends string = string> {
  id: string
  type: T
  fileName: string
  pages: DocumentPage[]
  /** Lo que trae el documento, si ya se conoce. */
  number: string | null
  /** Idiomas y nivel en un certificado de idiomas: "Inglés C1". */
  detail: string | null
  issuedOn: ISODate | null
  expiresOn: ISODate | null
  uploadedAt: LocalDateTime
  status: DocumentStatus
  /** Los `ReviewCheck.id` que marcó quien lo revisó. */
  checks: string[]
  /** Por qué se rechazó; quien lo subió lo lee tal cual. */
  note: string
  reviewedBy: string | null
  reviewedAt: LocalDateTime | null
}

export type ApplicationStatus = 'in_review' | 'changes_requested' | 'approved' | 'rejected'

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  in_review: 'En revisión',
  changes_requested: 'Corrección pedida',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

export type ReviewEventKind =
  | 'submitted'
  | 'resubmitted'
  | 'document_replaced'
  | 'assigned'
  | 'document_accepted'
  | 'document_rejected'
  | 'check_clear'
  | 'check_flagged'
  | 'stage'
  | 'changes_requested'
  | 'approved'
  | 'rejected'

/** Una línea del historial: quién hizo qué y cuándo. */
export interface ReviewEvent {
  id: string
  at: LocalDateTime
  kind: ReviewEventKind
  /** `null`: lo hizo quien se postuló. */
  actorId: string | null
  actorName: string
  text: string
}

/** Alguien del equipo que revisa solicitudes. */
export interface Reviewer {
  id: string
  name: string
  canDecide: boolean
}

export interface DocumentReviewInput {
  status: 'accepted' | 'rejected'
  checks: string[]
  note: string
}

export interface DecisionInput {
  decision: 'approved' | 'rejected'
  note: string
}

/** Un archivo que se sube antes de enviar: la API devuelve su URL. */
export interface UploadedFile {
  fileName: string
  url: string
}
