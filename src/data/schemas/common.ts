import { z } from 'zod'
import { isISODate } from '@/lib/dates'
import { parseClock } from '@/lib/time'

/** Hora en el formato que lee la app: `8:30 a.m.` */
export const clockSchema = z.string().refine((value) => parseClock(value) !== null, {
  error: 'Usa el formato 8:30 a.m.',
})

export const isoDateSchema = z.string().refine(isISODate, { error: 'Elige una fecha' })

export const imageUrlSchema = z.url({ error: 'Pega una dirección que empiece con https://' })

/** Nicaragua, con las islas del Caribe. */
export const latLngSchema = z.object({
  latitude: z.number({ error: 'Marca el punto en el mapa' }).min(10.7).max(15.1),
  longitude: z.number({ error: 'Marca el punto en el mapa' }).min(-87.7).max(-82.5),
})

export const optionalEmailSchema = z.union([z.literal(''), z.email({ error: 'Escribe un correo válido' })])
export const optionalUrlSchema = z.union([z.literal(''), imageUrlSchema])
export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\+?[\d\s-]{8,16}$/.test(value), {
    error: 'Escribe el número con código de país: +505 8888 8888',
  })
