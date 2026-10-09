import { z } from 'zod'
import type { ISODate } from '@/lib/dates'
import { isoDateSchema, latLngSchema, photoSchema } from './common'

const clock = z.string().regex(/^\d{2}:\d{2}$/, { error: 'Indica la hora' })

/**
 * Las reglas del formulario de un evento, las mismas que el API: empieza hoy o después (salvo que
 * se corrija uno ya programado sin moverle el inicio), no termina antes de empezar y las horas son
 * distintas (un cierre menor que la apertura termina de madrugada).
 */
export function eventInputSchema({ today, originalStart }: { today: ISODate; originalStart: ISODate | null }) {
  return z
    .object({
      cityId: z.string().min(1, { error: 'Elige la ciudad donde ocurre' }),
      category: z.string().min(1, { error: 'Elige una clase de evento' }),
      name: z.string().trim().min(3, { error: 'Escribe el nombre del evento' }).max(120, { error: 'Hasta 120 letras' }),
      description: z.string().trim().max(2000, { error: 'Hasta 2000 letras' }),
      venue: z.string().trim().min(2, { error: 'Escribe dónde es: el teatro, la plaza, el parque' }).max(150, { error: 'Hasta 150 letras' }),
      address: z.string().trim().max(200, { error: 'Hasta 200 letras' }),
      location: latLngSchema,
      startDate: isoDateSchema,
      endDate: isoDateSchema,
      startTime: clock,
      endTime: clock,
      entryPrice: z
        .number({ error: 'Escribe el precio; 0 si la entrada es libre' })
        .int({ error: 'En córdobas, sin decimales' })
        .min(0, { error: 'No puede ser negativo' })
        .max(100_000, { error: 'Hasta C$ 100 000' }),
      pointId: z.string().nullable(),
      images: z.array(photoSchema).max(8, { error: 'Hasta ocho fotos' }),
      featured: z.boolean(),
    })
    .superRefine((value, context) => {
      if (value.startDate < today && value.startDate !== originalStart) {
        context.addIssue({ code: 'custom', path: ['startDate'], message: 'El evento tiene que empezar hoy o después' })
      }
      if (value.endDate < value.startDate) {
        context.addIssue({ code: 'custom', path: ['endDate'], message: 'No puede terminar antes de empezar' })
      }
      if (value.startTime === value.endTime) {
        context.addIssue({ code: 'custom', path: ['endTime'], message: 'La hora de cierre tiene que ser otra' })
      }
    })
}

/** Lo mismo para clonar: sólo las fechas nuevas. */
export function cloneDatesSchema(today: ISODate) {
  return z
    .object({ startDate: isoDateSchema, endDate: isoDateSchema })
    .superRefine((value, context) => {
      if (value.startDate < today) context.addIssue({ code: 'custom', path: ['startDate'], message: 'Tiene que empezar hoy o después' })
      if (value.endDate < value.startDate) context.addIssue({ code: 'custom', path: ['endDate'], message: 'No puede terminar antes de empezar' })
    })
}
