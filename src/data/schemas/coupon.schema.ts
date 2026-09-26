import { z } from 'zod'
import { imageUrlSchema, isoDateSchema } from './common'

export const couponInputSchema = z.object({
  title: z.string().trim().min(4, { error: 'Escribe qué recibe el turista' }).max(60),
  description: z.string().trim().min(10, { error: 'Explica el beneficio (al menos 10 letras)' }).max(200),
  discountLabel: z.string().trim().min(2, { error: 'Escribe la etiqueta: "10% de descuento", "Gratis"…' }).max(24),
  cost: z
    .number({ error: 'Indica cuántas insignias cuesta' })
    .int()
    .min(1, { error: 'Mínimo 1 insignia' })
    .max(20, { error: 'Máximo 20 insignias' }),
  image: imageUrlSchema,
  organizationId: z.string().nullable(),
  stopId: z.string().nullable(),
  status: z.enum(['active', 'paused']),
  validUntil: isoDateSchema.nullable(),
  maxRedemptions: z.number().int().min(1, { error: 'Mínimo 1 canje' }).nullable(),
  terms: z.string().trim().max(200),
})

export const redemptionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^KP-[A-Z0-9]{4}-[A-Z0-9]{4}$/, { error: 'El código tiene la forma KP-XXXX-XXXX' })
