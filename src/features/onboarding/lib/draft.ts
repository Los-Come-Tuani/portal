import type { z } from 'zod'
import type { OrganizationApplicationInput } from '@/data/models'
import {
  applicationConsentSchema,
  applicationDocumentsSchema,
  applicationOrganizationSchema,
  applicationPlaceSchema,
  applicationRepresentativeSchema,
} from '@/data/schemas/organization-application.schema'

/** `public`: se postula la organización; `assisted`: el equipo la llena por ella. */
export type WizardMode = 'public' | 'assisted'

export type ApplicationDraft = OrganizationApplicationInput & { passwordConfirm: string; charge: boolean }

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
  charge: true,
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
export function validateStep(step: StepKey, draft: ApplicationDraft, mode: WizardMode = 'public'): FieldErrors {
  const errors: FieldErrors = {}
  const schema = step === 'representative' && mode === 'assisted' ? applicationRepresentativeSchema.pick({ representative: true }) : SCHEMAS[step]
  const result = schema.safeParse(draft)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.join('.')
      if (!(key in errors)) errors[key] = issue.message
    }
  }
  if (mode === 'public' && step === 'representative' && draft.password && draft.password !== draft.passwordConfirm) {
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

const STORAGE_KEYS: Record<WizardMode, string> = {
  public: 'kplan.portal.application-draft',
  assisted: 'kplan.portal.assisted-draft',
}

/** El borrador sobrevive a una recarga; la contraseña nunca se guarda. */
export function loadDraft(mode: WizardMode = 'public'): ApplicationDraft {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEYS[mode]) ?? 'null') as Partial<ApplicationDraft> | null
    return stored ? { ...EMPTY_DRAFT, ...stored, password: '', passwordConfirm: '' } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

export function saveDraft(draft: ApplicationDraft, mode: WizardMode = 'public'): void {
  try {
    const { password: _password, passwordConfirm: _confirm, ...rest } = draft
    sessionStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(rest))
  } catch {
    // Los archivos pueden no caber: se guarda sin ellos.
    try {
      const { password: _password, passwordConfirm: _confirm, documents: _documents, ...rest } = draft
      sessionStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(rest))
    } catch {
      // Sin espacio: el borrador sólo vive en la página.
    }
  }
}

export function clearDraft(mode: WizardMode = 'public'): void {
  sessionStorage.removeItem(STORAGE_KEYS[mode])
}
