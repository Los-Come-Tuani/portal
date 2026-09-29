import { z } from 'zod'
import { STOP_CATEGORIES } from '../models/stop'

const note = z.string().trim().max(400, { error: 'Máximo 400 caracteres' })

export const placeRequestInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('claim'),
    stopId: z.string().min(1, { error: 'Elige el lugar' }),
    note: note.min(10, { error: 'Cuéntanos por qué lo administras: así lo aprobamos más rápido' }),
  }),
  z.object({
    kind: z.literal('new'),
    newPlace: z.object({
      name: z.string().trim().min(3, { error: 'Escribe el nombre del lugar' }).max(80),
      category: z.enum(STOP_CATEGORIES, { error: 'Elige la categoría' }),
      address: z.string().trim().min(8, { error: 'Escribe la dirección con una referencia' }).max(160),
    }),
    note,
  }),
])

export const placeRequestDecisionSchema = z
  .object({ decision: z.enum(['approved', 'rejected']), note: z.string().trim().max(400) })
  .refine((value) => value.decision !== 'rejected' || value.note.length >= 10, {
    error: 'Explica por qué no se aprueba',
    path: ['note'],
  })
