/**
 * La solicitud con la que un comercio, una institución cultural o una alcaldía entra a
 * K'Plan (F3). Es lo que publica el API: tres clases de organización y un solo expediente
 * de verificación. El modelo de demo anterior (revisión por documento, etapas, alta
 * asistida) vive en `organization-application.ts` y se retira cuando el portal del equipo
 * pase a la cola real.
 */

export const ORGANIZATION_KINDS = ['business', 'institution', 'municipality'] as const
export type OrganizationKind = (typeof ORGANIZATION_KINDS)[number]

export const ORGANIZATION_KIND_LABELS: Record<OrganizationKind, string> = {
  business: 'Comercio',
  institution: 'Institución cultural',
  municipality: 'Alcaldía',
}

/** `submitted` y `in_review` están en la bandeja del equipo; los otros cierran el expediente. */
export type RequestStatus = 'submitted' | 'in_review' | 'approved' | 'rejected'

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Enviada',
  in_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

// ── Las listas de los formularios ─────────────────────────────────────────

export interface CatalogCity {
  id: string
  code: string
  name: string
  /** El centro de la ciudad, para encuadrar el mapa. */
  latitude: number
  longitude: number
  /** Ya se incorporó a la plataforma. */
  active: boolean
}

export interface CatalogOption {
  id: string
  code: string
  label: string
}

// ── Archivos ──────────────────────────────────────────────────────────────

/** Las clases de archivo que acepta el almacenamiento (`POST /upload/`). */
export type UploadKind = 'legal-document' | 'signature-dish-photo'

export interface UploadRule {
  contentTypes: readonly string[]
  maxBytes: number
}

const MEGABYTE = 1024 * 1024

/** Lo mismo que exige el API en `api_core/services/uploads.py`: aquí solo avisa antes de subir. */
export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  'legal-document': { contentTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxBytes: 10 * MEGABYTE },
  'signature-dish-photo': { contentTypes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MEGABYTE },
}

/** Un archivo ya subido: su clave se manda con la solicitud; la URL de lectura vence en minutos. */
export interface StoredFile {
  key: string
  /** `null` si el almacenamiento no está configurado. */
  url: string | null
  /** Solo lo conoce el navegador que lo subió; al corregir se muestra el de la clave. */
  fileName: string
}

/** El nombre legible de un archivo que solo tiene clave: `legal-document/0194….pdf` -> `0194….pdf`. */
export function fileNameOfKey(key: string): string {
  return key.slice(key.lastIndexOf('/') + 1)
}

// ── Datos de la organización ──────────────────────────────────────────────

/** Lunes a domingo, con el número que usa el API (`0` es domingo, `6` es sábado). */
export const HOURS_DAYS = [
  { weekday: 1, label: 'Lunes' },
  { weekday: 2, label: 'Martes' },
  { weekday: 3, label: 'Miércoles' },
  { weekday: 4, label: 'Jueves' },
  { weekday: 5, label: 'Viernes' },
  { weekday: 6, label: 'Sábado' },
  { weekday: 0, label: 'Domingo' },
] as const

/** Un día de la semana; `opens` y `closes` son `HH:MM` y van vacíos si el día está cerrado. */
export interface DayHours {
  weekday: number
  closed: boolean
  opens: string
  closes: string
}

export const CURRENCIES = ['NIO', 'USD'] as const
export type Currency = (typeof CURRENCIES)[number]

export const CURRENCY_LABELS: Record<Currency, string> = { NIO: 'C$ (córdobas)', USD: 'US$ (dólares)' }

export interface SignatureDish {
  name: string
  description: string
  /** Se escribe como texto: "120" o "120.50". */
  referencePrice: string
  currency: Currency
  photo: StoredFile | null
}

export interface BusinessData {
  kind: 'business'
  cityId: string
  businessTypeId: string
  ruc: string
  name: string
  address: string
  phone: string
  alternatePhone: string
  latitude: number | null
  longitude: number | null
  hours: DayHours[]
  signatureDish: SignatureDish
}

export interface InstitutionData {
  kind: 'institution'
  cityId: string
  institutionTypeId: string
  name: string
  contactEmail: string
  phone: string
  /** El documento que acredita su existencia legal. */
  document: StoredFile | null
}

export interface MunicipalityData {
  kind: 'municipality'
  cityId: string
  name: string
  contactEmail: string
  phone: string
  /** El documento que acredita la representación de quien solicita. */
  document: StoredFile | null
}

export type OrganizationData = BusinessData | InstitutionData | MunicipalityData

/** Quien se postula: su cuenta nace con esto, y el código es el que le llegó al correo. */
export interface ApplicantInput {
  firstName: string
  lastName: string
  email: string
  code: string
  password: string
}

// ── Lo que devuelve el API ────────────────────────────────────────────────

export interface RequestResolution {
  approved: boolean
  reason: { code: string; label: string } | null
  /** Lo que el equipo le comunica a quien se postuló. */
  note: string
  resolvedAt: string
}

export interface MyApplication {
  id: string
  kind: OrganizationKind
  organizationId: string
  organizationName: string
  status: RequestStatus
  submittedAt: string
  resolvedAt: string | null
  resolution: RequestResolution | null
  /** Lo que mandó, con la forma del formulario de corrección. */
  submitted: OrganizationData
}

// ── Valores iniciales y reglas ────────────────────────────────────────────

/** Una semana sin horario: nada escrito, nada cerrado. */
export function emptyHours(): DayHours[] {
  return HOURS_DAYS.map(({ weekday }) => ({ weekday, closed: false, opens: '', closes: '' }))
}

/** El mismo horario todos los días, el punto de partida más común de un comercio. */
export function sameHoursEveryDay(opens: string, closes: string, closedWeekdays: readonly number[] = []): DayHours[] {
  return HOURS_DAYS.map(({ weekday }) =>
    closedWeekdays.includes(weekday)
      ? { weekday, closed: true, opens: '', closes: '' }
      : { weekday, closed: false, opens, closes },
  )
}

/** Un horario guardado puede traer los días en otro orden o faltar alguno: se completa la semana. */
export function normalizeHours(rows: readonly DayHours[]): DayHours[] {
  return HOURS_DAYS.map(({ weekday }) => rows.find((row) => row.weekday === weekday) ?? { weekday, closed: true, opens: '', closes: '' })
}

export function emptyDish(): SignatureDish {
  return { name: '', description: '', referencePrice: '', currency: 'NIO', photo: null }
}

/** El formulario de una clase de organización, vacío. */
export function emptyOrganization(kind: OrganizationKind): OrganizationData {
  switch (kind) {
    case 'business':
      return {
        kind,
        cityId: '',
        businessTypeId: '',
        ruc: '',
        name: '',
        address: '',
        phone: '',
        alternatePhone: '',
        latitude: null,
        longitude: null,
        hours: emptyHours(),
        signatureDish: emptyDish(),
      }
    case 'institution':
      return { kind, cityId: '', institutionTypeId: '', name: '', contactEmail: '', phone: '', document: null }
    case 'municipality':
      return { kind, cityId: '', name: '', contactEmail: '', phone: '', document: null }
  }
}

/** La solicitud la puede corregir quien se postuló solo cuando el equipo la rechazó. */
export function canCorrect(application: Pick<MyApplication, 'status'>): boolean {
  return application.status === 'rejected'
}

/** Mientras el equipo no apruebe, quien se postuló solo ve su solicitud. */
export function isOpen(status: RequestStatus): boolean {
  return status === 'submitted' || status === 'in_review'
}
