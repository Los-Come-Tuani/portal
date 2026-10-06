import { z } from 'zod'
import { ORGANIZATION_TYPES } from '../models/organization'
import {
  documentPages,
  ORGANIZATION_DOCUMENT_INFO,
  ORGANIZATION_DOCUMENT_RULES,
  ORGANIZATION_DOCUMENT_TYPES,
} from '../models/organization-application'
import { STOP_CATEGORIES } from '../models/stop'
import { phoneSchema } from './common'

/** El RUC se escribe con o sin guiones; se guarda en mayúsculas y sin espacios. */
export const normalizeRuc = (value: string) => value.replace(/[\s-]/g, '').toUpperCase()

const RUC_PATTERN = /^[A-Z0-9]{13,14}$/
const CEDULA_PATTERN = /^\d{3}-?\d{6}-?\d{4}[A-Z]$/i

/** Paso 1: la organización. Negocios traen razón social, RUC y a qué se dedican. */
export const applicationOrganizationSchema = z
  .object({
    type: z.enum(ORGANIZATION_TYPES),
    name: z.string().trim().min(3, { error: 'Escribe el nombre con el que te conocen' }).max(80),
    legalName: z.string().trim().max(120),
    ruc: z.string().trim().max(20),
    kind: z.string().trim().max(60),
    city: z.string().trim().min(2, { error: 'Elige la ciudad' }),
    address: z.string().trim().min(8, { error: 'Escribe la dirección con una referencia' }).max(160),
    description: z
      .string()
      .trim()
      .min(30, { error: 'Cuéntanos en dos o tres líneas qué ofrecen a los turistas' })
      .max(500, { error: 'Máximo 500 caracteres' }),
  })
  .superRefine((value, context) => {
    if (value.type !== 'negocio') return
    if (value.legalName.length < 3) context.addIssue({ code: 'custom', path: ['legalName'], message: 'Escribe la razón social, como sale en el RUC' })
    if (!RUC_PATTERN.test(normalizeRuc(value.ruc))) {
      context.addIssue({ code: 'custom', path: ['ruc'], message: 'El RUC tiene 13 o 14 letras y números, como J0310000123456' })
    }
    if (value.kind.length < 3) context.addIssue({ code: 'custom', path: ['kind'], message: 'Escribe a qué se dedican: restaurante, tour operador…' })
  })

/** Paso 2: su lugar. Un negocio dice cuál es (ya en la app o nuevo); una alcaldía, cuáles administra. */
export const applicationPlaceSchema = z
  .object({
    type: z.enum(ORGANIZATION_TYPES),
    claimedStopIds: z.array(z.string()),
    newPlace: z
      .object({
        name: z.string().trim().min(3, { error: 'Escribe el nombre del lugar' }).max(80),
        category: z.enum(STOP_CATEGORIES, { error: 'Elige la categoría' }),
        address: z.string().trim().min(8, { error: 'Escribe la dirección del lugar' }).max(160),
      })
      .nullable(),
  })
  .superRefine((value, context) => {
    if (value.type === 'negocio' && value.claimedStopIds.length === 0 && !value.newPlace) {
      context.addIssue({ code: 'custom', path: ['claimedStopIds'], message: 'Elige tu lugar en la lista o agrégalo como nuevo' })
    }
  })

/** Paso 3: quién la representa. Su correo y contraseña son su cuenta del portal. */
export const applicationRepresentativeSchema = z.object({
  representative: z.object({
    name: z.string().trim().min(5, { error: 'Escribe nombre y apellido' }).max(80),
    cedula: z.string().trim().regex(CEDULA_PATTERN, { error: 'Escribe la cédula como 001-120390-0012K' }),
    role: z.string().trim().min(3, { error: 'Escribe su cargo: propietaria, gerente…' }).max(60),
    phone: phoneSchema.refine((value) => value !== '', { error: 'Escribe un teléfono' }),
    email: z.email({ error: 'Escribe un correo válido' }),
  }),
  password: z.string().min(8, { error: 'Mínimo 8 caracteres' }).max(72),
})

const documentInputSchema = z.object({
  type: z.enum(ORGANIZATION_DOCUMENT_TYPES),
  fileName: z.string().min(1),
  pages: z.array(z.object({ label: z.string().min(1), url: z.string().min(1) })).min(1),
})

/** Paso 4: los documentos que pide su tipo, con todas sus caras. */
export const applicationDocumentsSchema = z
  .object({
    type: z.enum(ORGANIZATION_TYPES),
    documents: z.array(documentInputSchema),
  })
  .superRefine((value, context) => {
    const rules = ORGANIZATION_DOCUMENT_RULES[value.type]
    const allowed = new Set([...rules.required, ...rules.optional])
    for (const type of rules.required) {
      const document = value.documents.find((item) => item.type === type)
      const pages = documentPages(type)
      if (!document) {
        context.addIssue({ code: 'custom', path: ['documents', type], message: `Sube ${ORGANIZATION_DOCUMENT_INFO[type].label.toLowerCase()}` })
      } else if (pages.some((label) => !document.pages.some((page) => page.label === label))) {
        context.addIssue({ code: 'custom', path: ['documents', type], message: `Falta: ${pages.join(' y ').toLowerCase()}` })
      }
    }
    for (const document of value.documents) {
      if (!allowed.has(document.type)) {
        context.addIssue({ code: 'custom', path: ['documents', document.type], message: 'Este documento no aplica' })
      }
    }
  })

export const applicationConsentSchema = z.object({
  accepted: z.literal(true, { error: 'Confirma que la información es verdadera' }),
})

/** Todo junto: lo que valida el backend al recibir la solicitud. */
export function parseApplication(value: unknown) {
  const steps = [
    applicationOrganizationSchema,
    applicationPlaceSchema,
    applicationRepresentativeSchema,
    applicationDocumentsSchema,
    applicationConsentSchema,
  ] as const
  const issues: z.ZodError['issues'] = []
  for (const schema of steps) {
    const result = schema.safeParse(value)
    if (!result.success) issues.push(...result.error.issues)
  }
  return issues
}

/** Alta asistida: lo mismo menos la contraseña; la persona la crea con su invitación. */
export function parseAssistedApplication(value: unknown) {
  const steps = [
    applicationOrganizationSchema,
    applicationPlaceSchema,
    applicationRepresentativeSchema.pick({ representative: true }),
    applicationDocumentsSchema,
    applicationConsentSchema,
    z.object({ charge: z.boolean() }),
  ] as const
  const issues: z.ZodError['issues'] = []
  for (const schema of steps) {
    const result = schema.safeParse(value)
    if (!result.success) issues.push(...result.error.issues)
  }
  return issues
}