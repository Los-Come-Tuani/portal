/**
 * Las listas de F5 como las siembra el API (`api_catalogs`): los documentos que se le piden a un
 * guía o traductor y los motivos para rechazar un documento o al prestador.
 */
import type { DocumentTypeInfo, ServiceCode } from '../../models'

export const CREDENTIAL_TYPES = [
  'cedula',
  'record_policia',
  'licencia_intur',
  'certificado_idioma',
  'licencia_conducir',
  'seguro_vehiculo',
] as const

export type CredentialTypeCode = (typeof CREDENTIAL_TYPES)[number]

export interface MockCredentialType {
  code: CredentialTypeCode
  label: string
  /** El servicio que acredita; nulo si se le pide a todos. */
  service: ServiceCode | null
  requiresExpiry: boolean
  requiresVehicle: boolean
  /** Para dibujar el escaneo de muestra. */
  scan: DocumentTypeInfo
}

const scan = (label: string, issuer: string, format: 'card' | 'sheet', requiredFor: string, pages?: string[]): DocumentTypeInfo => ({
  label,
  issuer,
  format,
  requiredFor,
  pages,
  checks: [],
})

export const CREDENTIAL_TYPE_INFO: Record<CredentialTypeCode, MockCredentialType> = {
  cedula: {
    code: 'cedula',
    label: 'Cédula de identidad',
    service: null,
    requiresExpiry: true,
    requiresVehicle: false,
    scan: scan('Cédula de identidad', 'Consejo Supremo Electoral', 'card', 'Todos', ['Frente', 'Reverso']),
  },
  record_policia: {
    code: 'record_policia',
    label: 'Récord de policía',
    service: null,
    requiresExpiry: false,
    requiresVehicle: false,
    scan: scan('Récord de policía', 'Policía Nacional', 'sheet', 'Todos'),
  },
  licencia_intur: {
    code: 'licencia_intur',
    label: 'Licencia o carné del INTUR',
    service: 'guia',
    requiresExpiry: true,
    requiresVehicle: false,
    scan: scan('Carné de guía de turismo', 'Instituto Nicaragüense de Turismo (INTUR)', 'card', 'Guías'),
  },
  certificado_idioma: {
    code: 'certificado_idioma',
    label: 'Certificado de idiomas',
    service: 'traductor',
    requiresExpiry: false,
    requiresVehicle: false,
    scan: scan('Certificado de idiomas', 'Centro de idiomas acreditado', 'sheet', 'Traductores'),
  },
  licencia_conducir: {
    code: 'licencia_conducir',
    label: 'Licencia de conducir',
    service: null,
    requiresExpiry: true,
    requiresVehicle: true,
    scan: scan('Licencia de conducir', 'Policía Nacional · Tránsito', 'card', 'Si lleva turistas'),
  },
  seguro_vehiculo: {
    code: 'seguro_vehiculo',
    label: 'Seguro del vehículo',
    service: null,
    requiresExpiry: true,
    requiresVehicle: true,
    scan: scan('Seguro del vehículo', 'Aseguradora', 'sheet', 'Si lleva turistas'),
  },
}

/** Los documentos que se le piden: los de todos, los del servicio que ofrece y los de vehículo si lleva turistas. */
export function requiredTypes(services: readonly string[], carriesTourists: boolean): MockCredentialType[] {
  return CREDENTIAL_TYPES.map((code) => CREDENTIAL_TYPE_INFO[code]).filter(
    (type) => (type.service === null || services.includes(type.service)) && (!type.requiresVehicle || carriesTourists),
  )
}

export interface MockReason {
  code: string
  label: string
  requiresText: boolean
}

export const DOCUMENT_REJECTION_REASONS: MockReason[] = [
  { code: 'documento_ilegible', label: 'El documento no se lee', requiresText: false },
  { code: 'documento_vencido', label: 'El documento está vencido', requiresText: false },
  { code: 'datos_no_coinciden', label: 'Los datos no coinciden con el documento', requiresText: false },
  { code: 'documento_incompleto', label: 'Falta una cara o una página', requiresText: false },
  { code: 'documento_no_corresponde', label: 'No es el documento que se pide', requiresText: false },
  { code: 'otro', label: 'Otro motivo', requiresText: true },
]

export const PROVIDER_REJECTION_REASONS: MockReason[] = [
  { code: 'antecedentes_no_favorables', label: 'Los antecedentes no son favorables', requiresText: false },
  { code: 'datos_no_coinciden', label: 'Los datos no coinciden con el documento', requiresText: false },
  { code: 'registro_duplicado', label: 'Ya existe un registro igual', requiresText: false },
  { code: 'otro', label: 'Otro motivo', requiresText: true },
]

/** El motivo con que se cierra un expediente cuando quien revisa pide correcciones. */
export const CHANGES_REQUESTED: MockReason = { code: 'documentos_por_corregir', label: 'Hay documentos por corregir', requiresText: false }

const ALL_REASONS = [...DOCUMENT_REJECTION_REASONS, ...PROVIDER_REJECTION_REASONS, CHANGES_REQUESTED]

export function reasonByCode(code: string | null): { code: string; label: string } | null {
  const found = code ? ALL_REASONS.find((item) => item.code === code) : undefined
  return found ? { code: found.code, label: found.label } : null
}

/** Los idiomas que siembra el API: el nombre que traen los datos de demo y su código. */
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'Inglés' },
  { code: 'fr', label: 'Francés' },
  { code: 'de', label: 'Alemán' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Portugués' },
]
