import { z } from 'zod'
import { CURRENCIES, type OrganizationData } from '../models/application'
import { newPasswordSchema } from './auth.schema'
import { normalizePrice, normalizeRuc } from './application-api.schema'

/**
 * Las reglas del formulario de la solicitud. Dicen lo mismo que el API (docs/organizaciones.md):
 * aquí solo se avisa antes de mandar; el API tiene la última palabra y sus errores por campo
 * vuelven al formulario.
 */

/** Los errores de un formulario con la ruta del campo como llave: `signatureDish.photo`. */
export type FieldErrors = Record<string, string>

const PHONE_PATTERN = /^[0-9+()\- ]{7,30}$/
const RUC_PATTERN = /^[A-Z0-9-]{13,16}$/
const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

const phone = z.string().trim().regex(PHONE_PATTERN, { error: 'Escribe el teléfono como 2311 0000 o +505 8888 8888' })
const email = z.string().trim().pipe(z.email({ error: 'Escribe un correo válido' }))
const cityId = z.string().min(1, { error: 'Elige la ciudad' })

// El territorio nicaragüense: el mismo rango que verifica el API.
const latitude = z
  .number({ error: 'Marca el punto en el mapa' })
  .min(10.7, { error: 'Marca el punto en el mapa, dentro de Nicaragua' })
  .max(15.1, { error: 'Marca el punto en el mapa, dentro de Nicaragua' })
const longitude = z
  .number({ error: 'Marca el punto en el mapa' })
  .min(-87.7, { error: 'Marca el punto en el mapa, dentro de Nicaragua' })
  .max(-82.6, { error: 'Marca el punto en el mapa, dentro de Nicaragua' })

const businessProfile = z.object({
  cityId,
  businessTypeId: z.string().min(1, { error: 'Elige a qué se dedica' }),
  name: z.string().trim().min(1, { error: 'Escribe el nombre del comercio' }).max(150, { error: 'Máximo 150 caracteres' }),
  ruc: z
    .string()
    .transform(normalizeRuc)
    .pipe(z.string().regex(RUC_PATTERN, { error: 'El RUC tiene de 13 a 16 letras, números o guiones, como J0310000123456' })),
  address: z.string().trim().min(8, { error: 'Escribe la dirección con una referencia' }).max(255, { error: 'Máximo 255 caracteres' }),
  phone,
  alternatePhone: z.union([z.literal(''), phone]),
  latitude,
  longitude,
})

const institutionProfile = z.object({
  cityId,
  institutionTypeId: z.string().min(1, { error: 'Elige el tipo de institución' }),
  name: z.string().trim().min(1, { error: 'Escribe el nombre de la institución' }).max(150, { error: 'Máximo 150 caracteres' }),
  contactEmail: email,
  phone,
})

const municipalityProfile = z.object({
  cityId,
  name: z.string().trim().min(1, { error: 'Escribe el nombre oficial de la alcaldía' }).max(150, { error: 'Máximo 150 caracteres' }),
  contactEmail: email,
  phone,
})

const clock = z.string().regex(CLOCK_PATTERN, { error: 'Escribe la hora' })

const dayHours = z
  .object({ weekday: z.number(), closed: z.boolean(), opens: z.string(), closes: z.string() })
  .superRefine((row, context) => {
    if (row.closed) return
    const opens = clock.safeParse(row.opens)
    const closes = clock.safeParse(row.closes)
    if (!opens.success) context.addIssue({ code: 'custom', path: ['opens'], message: 'Escribe la hora de apertura' })
    if (!closes.success) context.addIssue({ code: 'custom', path: ['closes'], message: 'Escribe la hora de cierre' })
    if (opens.success && closes.success && row.opens === row.closes) {
      context.addIssue({ code: 'custom', path: ['closes'], message: 'Abre y cierra a la misma hora' })
    }
  })

const file = (message: string) => z.object({ key: z.string().min(1) }, { error: message })

const businessDetails = z.object({
  hours: z.array(dayHours).length(7),
  signatureDish: z.object({
    name: z.string().trim().min(1, { error: 'Escribe el nombre del platillo' }).max(150, { error: 'Máximo 150 caracteres' }),
    description: z.string().trim().max(1000, { error: 'Máximo 1000 caracteres' }),
    referencePrice: z
      .string()
      .transform(normalizePrice)
      .pipe(
        z
          .string()
          .regex(PRICE_PATTERN, { error: 'Escribe el precio como 120 o 120.50' })
          .refine((value) => Number(value) > 0, { error: 'El precio tiene que ser mayor que cero' }),
      ),
    currency: z.enum(CURRENCIES, { error: 'Elige la moneda' }),
    photo: file('Sube la foto del platillo'),
  }),
})

const institutionDetails = z.object({ document: file('Sube el documento que acredita a la institución') })
const municipalityDetails = z.object({ document: file('Sube el documento que acredita que representas a la alcaldía') })

/** Los errores de un esquema, con la ruta como llave; el primero de cada campo. */
function check(schema: z.ZodType, value: unknown): FieldErrors {
  const errors: FieldErrors = {}
  const result = schema.safeParse(value)
  if (result.success) return errors
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    if (!(key in errors)) errors[key] = issue.message
  }
  return errors
}

/** El paso de los datos: la ciudad, qué es, cómo se llama y cómo contactarla. */
export function validateProfile(data: OrganizationData): FieldErrors {
  switch (data.kind) {
    case 'business':
      return check(businessProfile, data)
    case 'institution':
      return check(institutionProfile, data)
    case 'municipality':
      return check(municipalityProfile, data)
  }
}

/** El paso de lo que se sube: el horario y el platillo de un comercio, o el documento de las demás. */
export function validateDetails(data: OrganizationData): FieldErrors {
  switch (data.kind) {
    case 'business':
      return check(businessDetails, data)
    case 'institution':
      return check(institutionDetails, data)
    case 'municipality':
      return check(municipalityDetails, data)
  }
}

export interface ApplicantDraft {
  firstName: string
  lastName: string
  email: string
  code: string
  password: string
  passwordConfirm: string
}

export const EMPTY_APPLICANT: ApplicantDraft = { firstName: '', lastName: '', email: '', code: '', password: '', passwordConfirm: '' }

/** Lo que va en lugar del código cuando el API no lo pide (no tiene correo). */
export const SKIPPED_SIGNUP_CODE = '000000'

const applicantSchema = z
  .object({
    firstName: z.string().trim().min(1, { error: 'Escribe tu nombre' }).max(100, { error: 'Máximo 100 caracteres' }),
    lastName: z.string().trim().max(100, { error: 'Máximo 100 caracteres' }),
    email,
    code: z.string().trim().regex(/^\d{6}$/, { error: 'Escribe los 6 dígitos que te llegaron al correo' }),
    password: newPasswordSchema,
    passwordConfirm: z.string().min(1, { error: 'Repite la contraseña' }),
  })
  .refine((value) => value.password === value.passwordConfirm, { path: ['passwordConfirm'], error: 'Las contraseñas no coinciden' })

/** El paso de la cuenta de quien se postula. */
export function validateApplicant(applicant: ApplicantDraft): FieldErrors {
  return check(applicantSchema, applicant)
}

/** Solo el correo, para poder pedir el código antes de llenar lo demás. */
export function validateEmail(value: string): string | null {
  const result = email.safeParse(value)
  return result.success ? null : (result.error.issues[0]?.message ?? 'Escribe un correo válido')
}
