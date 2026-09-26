import { z } from 'zod'
import { parseClock } from '@/lib/time'
import { clockSchema, imageUrlSchema, isoDateSchema, latLngSchema } from './common'

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(4, { error: 'Escribe el nombre del evento' }).max(80),
    category: z.string().min(1, { error: 'Elige una categoría' }),
    date: isoDateSchema,
    startTime: clockSchema.optional(),
    endTime: clockSchema.optional(),
    location: z.string().trim().min(3, { error: 'Elige la ciudad' }),
    address: z.string().trim().min(5, { error: 'Escribe dónde es' }).max(140),
    description: z
      .string()
      .trim()
      .min(30, { error: 'Cuenta de qué se trata (al menos 30 letras)' })
      .max(800),
    images: z.array(imageUrlSchema).min(1, { error: 'Agrega al menos una foto' }).max(6),
    price: z.number({ error: 'Escribe el precio; 0 si la entrada es libre' }).min(0).max(100_000),
    coordinates: latLngSchema,
    organizerId: z.string().nullable(),
    stopId: z.string().nullable(),
    status: z.enum(['published', 'hidden']),
    featured: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    const start = value.startTime ? parseClock(value.startTime) : null
    const end = value.endTime ? parseClock(value.endTime) : null
    if (start !== null && end !== null && end <= start) {
      context.addIssue({ code: 'custom', path: ['endTime'], message: 'Tiene que terminar después de empezar' })
    }
    if (start === null && end !== null) {
      context.addIssue({ code: 'custom', path: ['startTime'], message: 'Indica a qué hora empieza' })
    }
  })

export const eventModerationSchema = z.object({
  status: z.enum(['published', 'hidden']).optional(),
  featured: z.boolean().optional(),
})
