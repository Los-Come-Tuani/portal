import { z } from 'zod'
import { ORGANIZATION_TYPES } from '../models/organization'
import { phoneSchema } from './common'

export const organizationInputSchema = z.object({
  type: z.enum(ORGANIZATION_TYPES),
  name: z.string().trim().min(3, { error: 'Escribe el nombre' }).max(80),
  kind: z.string().trim().min(3, { error: 'Escribe el tipo: restaurante, museo…' }).max(60),
  city: z.string().trim().min(2, { error: 'Elige la ciudad' }),
  stopIds: z.array(z.string()),
  status: z.enum(['pending', 'active', 'suspended']),
  contactName: z.string().trim().min(3, { error: 'Escribe el nombre del contacto' }).max(80),
  contactEmail: z.email({ error: 'Escribe un correo válido' }),
  contactPhone: phoneSchema.refine((value) => value !== '', { error: 'Escribe un teléfono' }),
})

export const pricingInputSchema = z.object({
  couponFee: z.number({ error: 'Escribe la tarifa' }).int().min(0).max(10_000),
  badgeActivationMonthly: z.number({ error: 'Escribe el precio' }).int().min(0).max(100_000),
  badgePacks: z
    .array(
      z.object({
        id: z.string(),
        badges: z.number({ error: 'Cantidad' }).int().min(10, { error: 'Mínimo 10' }).max(10_000),
        price: z.number({ error: 'Precio' }).int().min(0).max(1_000_000),
      }),
    )
    .min(1, { error: 'Deja al menos un paquete' })
    .max(6),
})

export const loginSchema = z.object({
  email: z.email({ error: 'Escribe un correo válido' }),
  password: z.string().min(1, { error: 'Escribe tu contraseña' }),
})
