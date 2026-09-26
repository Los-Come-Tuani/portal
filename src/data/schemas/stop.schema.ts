import { z } from 'zod'
import { parseClock, parseDuration } from '@/lib/time'
import { STOP_CATEGORIES } from '../models/stop'
import { clockSchema, imageUrlSchema, latLngSchema } from './common'

export const stopInputSchema = z
  .object({
    name: z.string().trim().min(3, { error: 'Escribe el nombre del lugar' }).max(80),
    category: z.enum(STOP_CATEGORIES, { error: 'Elige una categoría' }),
    address: z.string().trim().min(5, { error: 'Escribe la dirección' }).max(140),
    opensAt: clockSchema.optional(),
    closesAt: clockSchema.optional(),
    duration: z.string().refine((value) => parseDuration(value) > 0, {
      error: 'Indica cuánto dura la visita',
    }),
    description: z
      .string()
      .trim()
      .min(40, { error: 'Cuéntale al turista qué va a encontrar (al menos 40 letras)' })
      .max(600, { error: 'Máximo 600 letras' }),
    tip: z.string().trim().max(140, { error: 'Máximo 140 letras' }),
    images: z
      .array(imageUrlSchema)
      .min(1, { error: 'Agrega al menos una foto: la primera es la portada' })
      .max(8, { error: 'Máximo 8 fotos' }),
    coordinates: latLngSchema,
  })
  .superRefine((value, context) => {
    const opens = value.opensAt ? parseClock(value.opensAt) : null
    const closes = value.closesAt ? parseClock(value.closesAt) : null
    if ((opens === null) !== (closes === null)) {
      context.addIssue({
        code: 'custom',
        path: [opens === null ? 'opensAt' : 'closesAt'],
        message: 'Indica la apertura y el cierre, o marca que el lugar no cierra',
      })
    }
    if (opens !== null && closes !== null && closes <= opens) {
      context.addIssue({
        code: 'custom',
        path: ['closesAt'],
        message: 'El cierre tiene que ser después de la apertura, sin pasar de la medianoche',
      })
    }
  })
