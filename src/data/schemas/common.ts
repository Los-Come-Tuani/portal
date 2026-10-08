import { z } from 'zod'
import { isISODate } from '@/lib/dates'
import { parseClock } from '@/lib/time'

/** Hora en el formato que lee la app: `8:30 a.m.` */
export const clockSchema = z.string().refine((value) => parseClock(value) !== null, {
  error: 'Usa el formato 8:30 a.m.',
})

export const isoDateSchema = z.string().refine(isISODate, { error: 'Elige una fecha' })

export const imageUrlSchema = z.url({ error: 'Pega una dirección que empiece con https://' })

/** Una foto ya subida (o que el objeto ya tenía): se manda su clave. */
export const photoSchema = z.object({ key: z.string().min(1), url: z.string().nullable() })

/** Nicaragua, con las islas del Caribe: los mismos límites que el API. */
export const latLngSchema = z.object({
  latitude: z
    .number({ error: 'Marca el punto en el mapa' })
    .min(10.7, { error: 'Marca el punto en el mapa, dentro de Nicaragua' })
    .max(15.1, { error: 'Marca el punto en el mapa, dentro de Nicaragua' }),
  longitude: z
    .number({ error: 'Marca el punto en el mapa' })
    .min(-87.7, { error: 'Marca el punto en el mapa, dentro de Nicaragua' })
    .max(-82.6, { error: 'Marca el punto en el mapa, dentro de Nicaragua' }),
})

export const optionalEmailSchema = z.union([z.literal(''), z.email({ error: 'Escribe un correo válido' })])
export const optionalUrlSchema = z.union([z.literal(''), imageUrlSchema])
export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\+?[\d\s-]{8,16}$/.test(value), {
    error: 'Escribe el número con código de país: +505 8888 8888',
  })
