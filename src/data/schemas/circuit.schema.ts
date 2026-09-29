import { z } from 'zod'
import { parseClock } from '@/lib/time'
import { CIRCUIT_CATEGORIES, CIRCUIT_DIFFICULTIES, MAX_BONUS_BADGES } from '../models/circuit'
import { CITIES } from '../models/common'
import { clockSchema, imageUrlSchema, isoDateSchema, latLngSchema } from './common'

const cityNames = CITIES.map((city) => city.name) as [string, ...string[]]

export const circuitInputSchema = z
  .object({
    kind: z.enum(['kplan', 'creative', 'private']),
    title: z.string().trim().min(8, { error: 'Escribe el título completo' }).max(80, { error: 'Máximo 80 letras' }),
    shortTitle: z.string().trim().min(3, { error: 'Escribe un título corto' }).max(28, { error: 'Máximo 28 letras: sale en tarjetas' }),
    subtitle: z.string().trim().min(3, { error: 'Escribe una línea que lo resuma' }).max(60, { error: 'Máximo 60 letras' }),
    category: z.enum(CIRCUIT_CATEGORIES, { error: 'Elige una categoría' }),
    city: z.enum(cityNames, { error: 'Elige la ciudad' }),
    difficulty: z.enum(CIRCUIT_DIFFICULTIES, { error: 'Elige la dificultad' }),
    stopIds: z.array(z.string()).min(2, { error: 'Un circuito tiene al menos 2 paradas' }).max(10, { error: 'Máximo 10 paradas' }),
    travelMode: z.enum(['walking', 'vehicle']),
    legMinutes: z.record(z.string(), z.number().int().min(0)).optional(),
    startTimes: z.array(clockSchema).min(1, { error: 'Agrega al menos una hora de salida' }).max(6, { error: 'Máximo 6 horas de salida' }),
    priceAdult: z.number({ error: 'Escribe el precio' }).int({ error: 'Sin decimales' }).min(0).max(20_000, { error: 'Máximo C$ 20,000' }),
    priceChild: z.number({ error: 'Escribe el precio' }).int({ error: 'Sin decimales' }).min(0).max(20_000, { error: 'Máximo C$ 20,000' }),
    description: z
      .string()
      .trim()
      .min(60, { error: 'Cuéntale al turista qué va a vivir (al menos 60 letras)' })
      .max(600, { error: 'Máximo 600 letras' }),
    images: z.array(imageUrlSchema).min(1, { error: 'Agrega al menos una foto: la primera es la portada' }).max(8, { error: 'Máximo 8 fotos' }),
    recommendations: z.string().trim().max(200, { error: 'Máximo 200 letras' }),
    meetingPoint: z.string().trim().min(5, { error: 'Di dónde se encuentra el grupo' }).max(120, { error: 'Máximo 120 letras' }),
    location: latLngSchema,
    includes: z.string().trim().max(120, { error: 'Máximo 120 letras' }),
    notes: z.string().trim().max(200, { error: 'Máximo 200 letras' }),
    organizer: z.string().trim(),
    bonusBadges: z.number().int().min(0).max(MAX_BONUS_BADGES),
    bookingMode: z.enum(['private', 'group']),
    availableFrom: z.string().nullable(),
    availableUntil: z.string().nullable(),
    draft: z.boolean(),
  })
  .superRefine((value, context) => {
    const issue = (path: string, message: string) => context.addIssue({ code: 'custom', path: [path], message })
    if (value.kind === 'creative' && !value.organizer) issue('organizer', 'Elige la alcaldía que lo organiza')
    if (value.kind === 'kplan' && value.bonusBadges < 1) issue('bonusBadges', 'Un especial da al menos 1 insignia extra')
    if (value.kind === 'kplan' && (value.availableFrom !== null || value.availableUntil !== null)) {
      if (!isoDateSchema.safeParse(value.availableFrom).success) issue('availableFrom', 'Elige desde cuándo, o déjalo todo el año')
      else if (!isoDateSchema.safeParse(value.availableUntil).success) issue('availableUntil', 'Elige hasta cuándo, o déjalo todo el año')
      else if ((value.availableUntil ?? '') < (value.availableFrom ?? '')) issue('availableUntil', 'Termina antes de empezar')
    }
    if (new Set(value.stopIds).size !== value.stopIds.length) issue('stopIds', 'Una parada está repetida')
    const times = value.startTimes.map((time) => parseClock(time))
    if (new Set(times).size !== times.length) issue('startTimes', 'Hay una hora de salida repetida')
  })
