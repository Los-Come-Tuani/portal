import { z } from 'zod'
import { AMENITIES, type AmenityId } from '../models/place-profile'
import { optionalEmailSchema, optionalUrlSchema, phoneSchema, photoSchema } from './common'

const amenityIds = AMENITIES.map((amenity) => amenity.id) as [AmenityId, ...AmenityId[]]

export const offeringSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, { error: 'Escribe el nombre' }).max(60),
  description: z.string().trim().max(120, { error: 'Máximo 120 letras' }),
  price: z.number({ error: 'Escribe el precio o déjalo a consultar' }).min(0).max(1_000_000).nullable(),
})

export const placeProfileInputSchema = z.object({
  offerings: z.array(offeringSchema).max(24),
  amenities: z.array(z.enum(amenityIds)),
  languages: z.array(z.string()).min(1, { error: 'Elige al menos un idioma' }),
  contact: z.object({
    phone: phoneSchema,
    whatsapp: phoneSchema,
    email: optionalEmailSchema,
    website: optionalUrlSchema,
    instagram: z.string().trim().max(40),
    facebook: z.string().trim().max(80),
  }),
})

export const postInputSchema = z.object({
  stopId: z.string().min(1, { error: 'Elige el lugar' }),
  title: z.string().trim().min(4, { error: 'Escribe un título' }).max(80),
  body: z.string().trim().min(20, { error: 'Cuenta un poco más (al menos 20 letras)' }).max(500),
  image: photoSchema.nullable(),
  status: z.enum(['published', 'hidden']),
})
