import type { z } from 'zod'
import type { OrganizationApplicationInput } from '@/data/models'
import {
  applicationConsentSchema,
  applicationDocumentsSchema,
  applicationOrganizationSchema,
  applicationPlaceSchema,
  applicationRepresentativeSchema,
} from '@/data/schemas/organization-application.schema'

export type ApplicationDraft = OrganizationApplicationInput & { passwordConfirm: string }

export type FieldErrors = Record<string, string>

export const EMPTY_DRAFT: ApplicationDraft = {
  type: 'negocio',
  name: '',
  legalName: '',
  ruc: '',
  kind: '',
  city: '',
  address: '',
  description: '',
  claimedStopIds: [],
  newPlace: null,
  representative: { name: '', cedula: '', role: '', phone: '', email: '' },
  password: '',
  passwordConfirm: '',
  documents: [],
  accepted: false,
}

export const STEPS = [
  { key: 'organization', label: 'Tu organización' },
  { key: 'place', label: 'Tu lugar' },
  { key: 'representative', label: 'Quién la representa' },
  { key: 'documents', label: 'Documentos' },
  { key: 'review', label: 'Revisa y envía' },
] as const

export type StepKey = (typeof STEPS)[number]['key']

const SCHEMAS: Record<StepKey, z.ZodType> = {
  organization: applicationOrganizationSchema,
  place: applicationPlaceSchema,
  representative: applicationRepresentativeSchema,
  documents: applicationDocumentsSchema,
  review: applicationConsentSchema,
}

/** Los errores de un paso, con la ruta del campo como llave: `representative.email`. */
export function validateStep(step: StepKey, draft: ApplicationDraft): FieldErrors {
  const errors: FieldErrors = {}
  const result = SCHEMAS[step].safeParse(draft)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.join('.')
      if (!(key in errors)) errors[key] = issue.message
    }
  }
  if (step === 'representative' && draft.password && draft.password !== draft.passwordConfirm) {
    errors.passwordConfirm = 'Las contraseñas no coinciden'
  }
  return errors
}

/** En qué paso está un campo que la API rechazó. */
export function stepOfField(field: string): StepKey {
  if (field.startsWith('representative') || field.startsWith('password')) return 'representative'
  if (field.startsWith('claimedStopIds') || field.startsWith('newPlace')) return 'place'
  if (field.startsWith('documents')) return 'documents'
  if (field === 'accepted') return 'review'
  return 'organization'
}

const STORAGE_KEY = 'kplan.portal.application-draft'

/** El borrador sobrevive a una recarga; la contraseña nunca se guarda. */
export function loadDraft(): ApplicationDraft {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ApplicationDraft> | null
    return stored ? { ...EMPTY_DRAFT, ...stored, password: '', passwordConfirm: '' } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

export function saveDraft(draft: ApplicationDraft): void {
  try {
    const { password: _password, passwordConfirm: _confirm, ...rest } = draft
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch {
    // Los archivos pueden no caber: se guarda sin ellos.
    try {
      const { password: _password, passwordConfirm: _confirm, documents: _documents, ...rest } = draft
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch {
      // Sin espacio: el borrador sólo vive en la página.
    }
  }
}

export function clearDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
