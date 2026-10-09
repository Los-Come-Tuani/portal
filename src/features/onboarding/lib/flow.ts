import {
  emptyOrganization,
  ORGANIZATION_KINDS,
  type ApplicantInput,
  type OrganizationData,
  type OrganizationKind,
} from '@/data/models'
import {
  EMPTY_APPLICANT,
  validateApplicant,
  validateDetails,
  validateProfile,
  type ApplicantDraft,
  type FieldErrors,
} from '@/data/schemas/application.schema'

/** `apply`: la organización se postula sola; `correct`: corrige lo que el equipo rechazó. */
export type FlowMode = 'apply' | 'correct'

export type StepKey = 'kind' | 'profile' | 'details' | 'account' | 'review'

export const STEPS: Record<FlowMode, readonly StepKey[]> = {
  apply: ['kind', 'profile', 'details', 'account', 'review'],
  correct: ['profile', 'details', 'review'],
}

export interface FlowDraft {
  /** `null` mientras no elige qué clase de organización es. */
  data: OrganizationData | null
  applicant: ApplicantDraft
  accepted: boolean
}

export const EMPTY_DRAFT: FlowDraft = { data: null, applicant: EMPTY_APPLICANT, accepted: false }

/** Cambiar de clase empieza de cero lo que dependía de ella; la ciudad se conserva. */
export function withKind(draft: FlowDraft, kind: OrganizationKind): FlowDraft {
  if (draft.data?.kind === kind) return draft
  return { ...draft, data: { ...emptyOrganization(kind), cityId: draft.data?.cityId ?? '' } }
}

export function stepLabel(step: StepKey, kind: OrganizationKind | null): string {
  switch (step) {
    case 'kind':
      return 'Qué eres'
    case 'profile':
      return 'Tus datos'
    case 'details':
      return kind === 'business' ? 'Horario y platillo' : 'Documento'
    case 'account':
      return 'Tu cuenta'
    case 'review':
      return 'Revisa y envía'
  }
}

export function stepCopy(step: StepKey, kind: OrganizationKind | null, mode: FlowMode): { title: string; description: string } {
  switch (step) {
    case 'kind':
      return { title: '¿Qué organización eres?', description: "Cada una entra a K'Plan por su camino. Elige la que mejor te describe." }
    case 'profile':
      return {
        title: mode === 'correct' ? 'Corrige tus datos' : 'Cuéntanos de tu organización',
        description:
          mode === 'correct'
            ? 'Cambia lo que el equipo te pidió corregir. Lo demás ya está llenado con lo que mandaste.'
            : 'Así te va a encontrar el turista en la app.',
      }
    case 'details':
      return kind === 'business'
        ? { title: 'Tu horario y tu platillo estrella', description: 'El turista ve cuándo abres y con qué platillo quieres que te conozcan.' }
        : {
            title: 'Sube tu documento',
            description:
              kind === 'institution'
                ? 'Con él comprobamos que la institución existe legalmente: el acta de constitución o su personería jurídica.'
                : 'Con él comprobamos que representas a la alcaldía: la credencial o la carta de designación.',
          }
    case 'account':
      return {
        title: 'Crea tu cuenta',
        description: 'Con este correo y contraseña entras al portal mientras revisamos tu solicitud.',
      }
    case 'review':
      return {
        title: 'Revisa y envía',
        description:
          mode === 'correct'
            ? 'El equipo de K\'Plan vuelve a revisar tu solicitud y te avisa por correo.'
            : "El equipo de K'Plan revisa tu solicitud y te avisa por correo y aquí en el portal.",
      }
  }
}

/** Los errores de un paso, con la ruta del campo como llave: `signatureDish.photo`, `applicant.email`. */
export function validateStep(step: StepKey, draft: FlowDraft): FieldErrors {
  const { data } = draft
  switch (step) {
    case 'kind':
      return data ? {} : { kind: 'Elige qué organización eres' }
    case 'profile':
      return data ? validateProfile(data) : { kind: 'Elige qué organización eres' }
    case 'details':
      return data ? validateDetails(data) : { kind: 'Elige qué organización eres' }
    case 'account':
      return Object.fromEntries(Object.entries(validateApplicant(draft.applicant)).map(([key, message]) => [`applicant.${key}`, message]))
    case 'review':
      return draft.accepted ? {} : { accepted: 'Confirma que la información es verdadera' }
  }
}

const APPLICANT_FIELDS = new Set(['firstName', 'lastName', 'email', 'code', 'password'])

/**
 * Los errores por campo que devuelve el API, con el nombre que tiene el campo en el formulario:
 * la foto y el documento se mandan por su clave (`photoKey`), y la cuenta cuelga de `applicant`.
 */
export function formErrorsFromApi(errors: Record<string, string>): FieldErrors {
  const result: FieldErrors = {}
  for (const [key, message] of Object.entries(errors)) {
    const field = key.replace(/photoKey$/, 'photo').replace(/^documentKey$/, 'document')
    result[APPLICANT_FIELDS.has(field) ? `applicant.${field}` : field] = message
  }
  return result
}

/** En qué paso está un campo que el API rechazó. */
export function stepOfField(field: string): StepKey {
  if (field === 'kind') return 'kind'
  if (field.startsWith('applicant.')) return 'account'
  if (field === 'accepted') return 'review'
  if (field.startsWith('hours') || field.startsWith('signatureDish') || field.startsWith('document')) return 'details'
  return 'profile'
}

export function toApplicantInput(applicant: ApplicantDraft): ApplicantInput {
  return {
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    email: applicant.email,
    code: applicant.code,
    password: applicant.password,
  }
}

// ── El borrador sobrevive a una recarga ───────────────────────────────────

const STORAGE_KEY = 'kplan.portal.application-draft.v2'

/** La contraseña y el código nunca se guardan: el código es de un solo uso. */
export function saveDraft(draft: FlowDraft): void {
  try {
    const { password: _password, passwordConfirm: _confirm, code: _code, ...applicant } = draft.applicant
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ data: draft.data, applicant }))
  } catch {
    // Sin espacio o en modo privado: el borrador solo vive en la página.
  }
}

export function loadDraft(): FlowDraft {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as {
      data?: OrganizationData | null
      applicant?: Partial<ApplicantDraft>
    } | null
    if (!stored) return EMPTY_DRAFT
    // Un borrador viejo o a medias, con una clase que ya no existe, no se restaura.
    const data = stored.data && ORGANIZATION_KINDS.includes(stored.data.kind) ? stored.data : null
    return { data, applicant: { ...EMPTY_APPLICANT, ...stored.applicant }, accepted: false }
  } catch {
    return EMPTY_DRAFT
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada que borrar.
  }
}
