import type { ISODate, LocalDateTime } from './common'

/** Igual que `role` en mobile/assets/mock/guides.json. */
export type GuideServiceRole = 'guide' | 'translator' | 'both'

export const SERVICE_ROLE_LABELS: Record<GuideServiceRole, string> = {
  guide: 'Guía',
  translator: 'Traductor',
  both: 'Guía y traductor',
}

// ── Documentos ────────────────────────────────────────────────────────────

export const DOCUMENT_TYPES = [
  'cedula',
  'record-policia',
  'carne-intur',
  'primeros-auxilios',
  'certificado-idioma',
  'licencia-conducir',
  'seguro-vehiculo',
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export interface ReviewCheck {
  id: string
  label: string
}

export interface DocumentTypeInfo {
  label: string
  issuer: string
  /** `card`: carné o cédula; `sheet`: constancia o certificado. */
  format: 'card' | 'sheet'
  /** Para quién es obligatorio. */
  requiredFor: string
  checks: ReviewCheck[]
}

const LEGIBLE: ReviewCheck = { id: 'legible', label: 'Se lee completo, sin partes cortadas ni borrosas' }
const SAME_NAME: ReviewCheck = { id: 'nombre', label: 'El nombre coincide con el de la cédula' }
const VALID: ReviewCheck = { id: 'vigente', label: 'Está vigente' }
const UNALTERED: ReviewCheck = { id: 'integro', label: 'No tiene señales de edición o alteración' }

/** Qué se revisa en cada documento. Aceptarlo exige marcar todo. */
export const DOCUMENT_TYPE_INFO: Record<DocumentType, DocumentTypeInfo> = {
  cedula: {
    label: 'Cédula de identidad',
    issuer: 'Consejo Supremo Electoral',
    format: 'card',
    requiredFor: 'Todos',
    checks: [
      LEGIBLE,
      { id: 'ambos-lados', label: 'Trae el frente y el reverso' },
      { id: 'nombre', label: 'El nombre coincide con el de la solicitud' },
      { id: 'foto', label: 'La foto es de la misma persona del perfil' },
      VALID,
      UNALTERED,
    ],
  },
  'record-policia': {
    label: 'Récord de policía',
    issuer: 'Policía Nacional',
    format: 'sheet',
    requiredFor: 'Todos',
    checks: [
      LEGIBLE,
      SAME_NAME,
      { id: 'reciente', label: 'Se emitió hace menos de 3 meses' },
      { id: 'sin-antecedentes', label: 'Dice que no tiene antecedentes' },
      UNALTERED,
    ],
  },
  'carne-intur': {
    label: 'Carné de guía de turismo',
    issuer: 'Instituto Nicaragüense de Turismo (INTUR)',
    format: 'card',
    requiredFor: 'Guías',
    checks: [
      LEGIBLE,
      SAME_NAME,
      { id: 'registro', label: 'Tiene número de registro de INTUR' },
      { id: 'categoria', label: 'La categoría cubre los recorridos que ofrece' },
      VALID,
      UNALTERED,
    ],
  },
  'primeros-auxilios': {
    label: 'Certificado de primeros auxilios',
    issuer: 'Cruz Roja Nicaragüense',
    format: 'sheet',
    requiredFor: 'Guías',
    checks: [LEGIBLE, SAME_NAME, { id: 'emisor', label: 'Lo emite una institución reconocida' }, VALID, UNALTERED],
  },
  'certificado-idioma': {
    label: 'Certificado de idiomas',
    issuer: 'Centro de idiomas acreditado',
    format: 'sheet',
    requiredFor: 'Traductores',
    checks: [
      LEGIBLE,
      SAME_NAME,
      { id: 'idiomas', label: 'Cubre los idiomas que dice hablar' },
      { id: 'nivel', label: 'El nivel es B2 o más alto' },
      UNALTERED,
    ],
  },
  'licencia-conducir': {
    label: 'Licencia de conducir',
    issuer: 'Policía Nacional · Tránsito',
    format: 'card',
    requiredFor: 'Si pone vehículo',
    checks: [LEGIBLE, SAME_NAME, { id: 'pasajeros', label: 'La categoría permite llevar pasajeros' }, VALID, UNALTERED],
  },
  'seguro-vehiculo': {
    label: 'Seguro del vehículo',
    issuer: 'Aseguradora',
    format: 'sheet',
    requiredFor: 'Si pone vehículo',
    checks: [LEGIBLE, SAME_NAME, { id: 'cobertura', label: 'Cubre a los pasajeros' }, VALID, UNALTERED],
  },
}

export type DocumentStatus = 'pending' | 'accepted' | 'rejected'

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Por revisar',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
}

/** Una página o cara del archivo que subió: la cédula trae frente y reverso. */
export interface DocumentPage {
  label: string
  url: string
}

export interface GuideDocument {
  id: string
  type: DocumentType
  fileName: string
  pages: DocumentPage[]
  /** El número que trae el documento. */
  number: string
  /** Idiomas y nivel en un certificado de idiomas: "Inglés C1". */
  detail: string | null
  issuedOn: ISODate
  expiresOn: ISODate | null
  uploadedAt: LocalDateTime
  status: DocumentStatus
  /** Los `ReviewCheck.id` que marcó quien lo revisó. */
  checks: string[]
  /** Por qué se rechazó; el guía lo ve en la app. */
  note: string
  reviewedBy: string | null
  reviewedAt: LocalDateTime | null
}

// ── Antecedentes ──────────────────────────────────────────────────────────

export const BACKGROUND_CHECK_TYPES = ['policia', 'intur', 'referencias'] as const
export type BackgroundCheckType = (typeof BACKGROUND_CHECK_TYPES)[number]

export const BACKGROUND_CHECK_INFO: Record<BackgroundCheckType, { label: string; description: string }> = {
  policia: {
    label: 'Antecedentes policiales',
    description: 'Confirma con la Policía Nacional que el récord es auténtico y sigue limpio.',
  },
  intur: {
    label: 'Registro de INTUR',
    description: 'Confirma que el carné está activo en el registro de guías de INTUR.',
  },
  referencias: {
    label: 'Referencias',
    description: 'Llama a sus referencias y confirma su experiencia y su trato con turistas.',
  },
}

export type CheckStatus = 'pending' | 'clear' | 'flagged'

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  pending: 'Por verificar',
  clear: 'Sin problemas',
  flagged: 'Con observaciones',
}

export interface BackgroundCheck {
  type: BackgroundCheckType
  status: CheckStatus
  note: string
  checkedBy: string | null
  checkedAt: LocalDateTime | null
}

export interface GuideReference {
  name: string
  relation: string
  phone: string
}

// ── Solicitud ─────────────────────────────────────────────────────────────

export const VERIFICATION_STAGES = ['documents', 'background', 'decision'] as const
export type VerificationStage = (typeof VERIFICATION_STAGES)[number]

export const STAGE_LABELS: Record<VerificationStage, string> = {
  documents: 'Documentos',
  background: 'Antecedentes',
  decision: 'Decisión',
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
  /** `null`: lo hizo el guía desde la app. */
  actorId: string | null
  actorName: string
  text: string
}

/** Lo que un guía o traductor envía desde la app para que K'Plan lo verifique. */
export interface GuideApplication {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  city: string
  photoUrl: string
  serviceRole: GuideServiceRole
  languages: string[]
  specialties: string[]
  yearsExperience: number
  hasTransport: boolean
  bio: string
  references: GuideReference[]
  submittedAt: LocalDateTime
  stage: VerificationStage
  /** Desde cuándo está en la etapa (o en el estado) actual. */
  stageSince: LocalDateTime
  status: ApplicationStatus
  assigneeId: string | null
  documents: GuideDocument[]
  background: BackgroundCheck[]
  decisionNote: string
  decidedAt: LocalDateTime | null
  history: ReviewEvent[]
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

export interface BackgroundCheckInput {
  status: 'clear' | 'flagged'
  note: string
}

export interface DecisionInput {
  decision: 'approved' | 'rejected'
  note: string
}

// ── Reglas ────────────────────────────────────────────────────────────────

const offersTours = (role: GuideServiceRole) => role !== 'translator'
const translates = (role: GuideServiceRole) => role !== 'guide'

/** Los documentos que tiene que traer, según lo que ofrece. */
export function requiredDocuments(application: Pick<GuideApplication, 'serviceRole' | 'hasTransport'>): DocumentType[] {
  const { serviceRole, hasTransport } = application
  return DOCUMENT_TYPES.filter((type) => {
    if (type === 'carne-intur' || type === 'primeros-auxilios') return offersTours(serviceRole)
    if (type === 'certificado-idioma') return translates(serviceRole)
    if (type === 'licencia-conducir' || type === 'seguro-vehiculo') return hasTransport
    return true
  })
}

/** Las verificaciones de antecedentes que le tocan. */
export function requiredChecks(application: Pick<GuideApplication, 'serviceRole'>): BackgroundCheckType[] {
  return BACKGROUND_CHECK_TYPES.filter((type) => type !== 'intur' || offersTours(application.serviceRole))
}

export interface DocumentProgress {
  required: number
  accepted: number
  rejected: number
  pending: number
  missing: DocumentType[]
}

export function documentProgress(application: GuideApplication): DocumentProgress {
  const required = requiredDocuments(application)
  const byType = new Map(application.documents.map((document) => [document.type, document]))
  const count = (status: DocumentStatus) => required.filter((type) => byType.get(type)?.status === status).length
  return {
    required: required.length,
    accepted: count('accepted'),
    rejected: count('rejected'),
    pending: count('pending'),
    missing: required.filter((type) => !byType.has(type)),
  }
}

export function checkProgress(application: GuideApplication): { required: number; clear: number; flagged: number } {
  const required = requiredChecks(application)
  const byType = new Map(application.background.map((check) => [check.type, check]))
  return {
    required: required.length,
    clear: required.filter((type) => byType.get(type)?.status === 'clear').length,
    flagged: required.filter((type) => byType.get(type)?.status === 'flagged').length,
  }
}

/** Por qué todavía no puede pasar a la siguiente etapa; `null` si ya puede. */
export function advanceBlocker(application: GuideApplication): string | null {
  if (application.status !== 'in_review') return 'La solicitud no está en revisión'
  if (application.stage === 'documents') {
    const progress = documentProgress(application)
    if (progress.missing.length > 0) return 'Faltan documentos obligatorios: pide una corrección'
    if (progress.rejected > 0) return 'Hay documentos rechazados: pide una corrección'
    if (progress.accepted < progress.required) return 'Revisa todos los documentos primero'
    return null
  }
  if (application.stage === 'background') {
    const progress = checkProgress(application)
    if (progress.clear + progress.flagged < progress.required) return 'Completa todas las verificaciones primero'
    return null
  }
  return 'Ya está en la última etapa'
}
