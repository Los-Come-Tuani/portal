import type { LocalDateTime } from './common'
import type { OrganizationType } from './organization'
import {
  LEGIBLE,
  UNALTERED,
  VALID,
  type ApplicationStatus,
  type DocumentPage,
  type DocumentTypeInfo,
  type ReviewDocument,
  type ReviewEvent,
} from './review'
import type { StopCategory } from './stop'

// ── Documentos ────────────────────────────────────────────────────────────

export const ORGANIZATION_DOCUMENT_TYPES = [
  'ruc',
  'matricula-municipal',
  'carta-designacion',
  'cedula-representante',
  'licencia-intur',
  'permiso-sanitario',
] as const

export type OrganizationDocumentType = (typeof ORGANIZATION_DOCUMENT_TYPES)[number]

/** Qué se revisa en cada documento. Aceptarlo exige marcar todo. */
export const ORGANIZATION_DOCUMENT_INFO: Record<OrganizationDocumentType, DocumentTypeInfo> = {
  ruc: {
    label: 'Constancia de RUC',
    issuer: 'Dirección General de Ingresos (DGI)',
    format: 'sheet',
    requiredFor: 'Negocios',
    checks: [
      LEGIBLE,
      { id: 'razon-social', label: 'La razón social coincide con la de la solicitud' },
      { id: 'numero', label: 'El número de RUC coincide con el de la solicitud' },
      { id: 'activo', label: 'Dice que el contribuyente está activo' },
      { id: 'actividad', label: 'La actividad económica corresponde a lo que ofrece' },
      UNALTERED,
    ],
  },
  'matricula-municipal': {
    label: 'Matrícula municipal',
    issuer: 'Alcaldía del municipio',
    format: 'sheet',
    requiredFor: 'Negocios',
    checks: [
      LEGIBLE,
      { id: 'titular', label: 'Está a nombre del negocio o de quien lo representa' },
      { id: 'direccion', label: 'La dirección coincide con la del local' },
      { id: 'anio', label: 'Es del año en curso' },
      UNALTERED,
    ],
  },
  'carta-designacion': {
    label: 'Carta de designación',
    issuer: 'Despacho del alcalde',
    format: 'sheet',
    requiredFor: 'Alcaldías',
    checks: [
      LEGIBLE,
      { id: 'firma', label: 'Está firmada y sellada por la alcaldía' },
      { id: 'persona', label: 'Designa a la persona que se postula' },
      { id: 'reciente', label: 'Tiene fecha de este año' },
      UNALTERED,
    ],
  },
  'cedula-representante': {
    label: 'Cédula de quien la representa',
    issuer: 'Consejo Supremo Electoral',
    format: 'card',
    requiredFor: 'Todos',
    pages: ['Frente', 'Reverso'],
    checks: [
      LEGIBLE,
      { id: 'ambos-lados', label: 'Trae el frente y el reverso' },
      { id: 'nombre', label: 'El nombre coincide con el de quien la representa' },
      VALID,
      UNALTERED,
    ],
  },
  'licencia-intur': {
    label: 'Licencia de turismo',
    issuer: 'Instituto Nicaragüense de Turismo (INTUR)',
    format: 'sheet',
    requiredFor: 'Si da tours, hospedaje o transporte',
    checks: [
      LEGIBLE,
      { id: 'titular', label: 'Está a nombre de la razón social' },
      { id: 'categoria', label: 'La categoría cubre lo que ofrece' },
      VALID,
      UNALTERED,
    ],
  },
  'permiso-sanitario': {
    label: 'Permiso sanitario',
    issuer: 'Ministerio de Salud (MINSA)',
    format: 'sheet',
    requiredFor: 'Si vende comida o bebida',
    checks: [LEGIBLE, { id: 'titular', label: 'Está a nombre del negocio' }, VALID, UNALTERED],
  },
}

/** Lo que pide cada tipo de organización; los opcionales se revisan igual si los suben. */
export const ORGANIZATION_DOCUMENT_RULES: Record<
  OrganizationType,
  { required: OrganizationDocumentType[]; optional: OrganizationDocumentType[] }
> = {
  negocio: { required: ['ruc', 'matricula-municipal', 'cedula-representante'], optional: ['licencia-intur', 'permiso-sanitario'] },
  alcaldia: { required: ['carta-designacion', 'cedula-representante'], optional: [] },
}

export function documentPages(type: OrganizationDocumentType): string[] {
  return ORGANIZATION_DOCUMENT_INFO[type].pages ?? ['Archivo']
}

export type OrganizationDocument = ReviewDocument<OrganizationDocumentType>

// ── Solicitud ─────────────────────────────────────────────────────────────

export const ADMISSION_STAGES = ['documents', 'decision'] as const
export type AdmissionStage = (typeof ADMISSION_STAGES)[number]

export const ADMISSION_STAGE_LABELS: Record<AdmissionStage, string> = {
  documents: 'Documentos',
  decision: 'Decisión',
}

export interface Representative {
  name: string
  cedula: string
  /** "Propietaria", "Gerente", "Directora de turismo"… */
  role: string
  phone: string
  email: string
}

/** Un lugar que todavía no está en la app: se crea como borrador. */
export interface NewPlace {
  name: string
  category: StopCategory
  address: string
}

/** Lo que manda un negocio o una alcaldía para entrar a K'Plan. */
export interface OrganizationApplication {
  id: string
  organizationId: string
  userId: string
  type: OrganizationType
  /** Nombre comercial: el que ve el turista. */
  name: string
  /** Sólo negocios. */
  legalName: string | null
  ruc: string | null
  kind: string
  city: string
  address: string
  description: string
  representative: Representative
  /** Lugares que ya están en la app y dice administrar; se le asignan al aprobarla. */
  claimedStopIds: string[]
  /** El borrador de su lugar nuevo; se publica al aprobarla. */
  newStopId: string | null
  submittedAt: LocalDateTime
  stage: AdmissionStage
  /** Desde cuándo está en la etapa (o en el estado) actual. */
  stageSince: LocalDateTime
  status: ApplicationStatus
  assigneeId: string | null
  documents: OrganizationDocument[]
  decisionNote: string
  decidedAt: LocalDateTime | null
  history: ReviewEvent[]
}

export interface ApplicationDocumentInput {
  type: OrganizationDocumentType
  fileName: string
  pages: DocumentPage[]
}

export interface OrganizationApplicationInput {
  type: OrganizationType
  name: string
  legalName: string
  ruc: string
  kind: string
  city: string
  address: string
  description: string
  claimedStopIds: string[]
  newPlace: NewPlace | null
  representative: Representative
  password: string
  documents: ApplicationDocumentInput[]
  accepted: boolean
}

// ── Reglas ────────────────────────────────────────────────────────────────

export function admissionRequirements(type: OrganizationType): { type: OrganizationDocumentType; required: boolean }[] {
  const rules = ORGANIZATION_DOCUMENT_RULES[type]
  return [
    ...rules.required.map((item) => ({ type: item, required: true })),
    ...rules.optional.map((item) => ({ type: item, required: false })),
  ]
}

/** Por qué todavía no puede pasar a la decisión; `null` si ya puede. */
export function admissionBlocker(application: OrganizationApplication): string | null {
  if (application.status !== 'in_review') return 'La solicitud no está en revisión'
  if (application.stage !== 'documents') return 'Ya está en la última etapa'
  const byType = new Map(application.documents.map((document) => [document.type, document]))
  if (ORGANIZATION_DOCUMENT_RULES[application.type].required.some((type) => !byType.has(type))) {
    return 'Faltan documentos obligatorios: pide una corrección'
  }
  if (application.documents.some((document) => document.status === 'rejected')) return 'Hay documentos rechazados: pide una corrección'
  if (application.documents.some((document) => document.status === 'pending')) return 'Revisa todos los documentos primero'
  return null
}

/** Lo que le falta a quien se postuló para volver a mandar su solicitud; `null` si ya puede. */
export function resubmitBlocker(application: OrganizationApplication): string | null {
  if (application.status !== 'changes_requested') return 'No hay correcciones pendientes'
  const byType = new Map(application.documents.map((document) => [document.type, document]))
  const missing = ORGANIZATION_DOCUMENT_RULES[application.type].required.filter((type) => !byType.has(type))
  if (missing.length > 0) return `Sube ${ORGANIZATION_DOCUMENT_INFO[missing[0]].label.toLowerCase()}`
  const rejected = application.documents.filter((document) => document.status === 'rejected')
  if (rejected.length > 0) return `Sube de nuevo: ${rejected.map((document) => ORGANIZATION_DOCUMENT_INFO[document.type].label.toLowerCase()).join(', ')}`
  return null
}
