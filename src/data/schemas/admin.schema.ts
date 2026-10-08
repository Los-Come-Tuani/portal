import { z } from 'zod'
import { ORGANIZATION_TYPES } from '../models/organization'
import { phoneSchema } from './common'

export const organizationInputSchema = z.object({
  type: z.enum(ORGANIZATION_TYPES),
  name: z.string().trim().min(3, { error: 'Escribe el nombre' }).max(80),
  kind: z.string().trim().min(3, { error: 'Escribe el tipo: restaurante, museo…' }).max(60),
  city: z.string().trim().min(2, { error: 'Elige la ciudad' }),
  status: z.enum(['pending', 'active', 'suspended']),
  contactName: z.string().trim().min(3, { error: 'Escribe el nombre del contacto' }).max(80),
  contactEmail: z.email({ error: 'Escribe un correo válido' }),
  contactPhone: phoneSchema.refine((value) => value !== '', { error: 'Escribe un teléfono' }),
})

/** Las tarifas de K'Plan, con los límites del API (`PUT pricing/`). Sólo córdobas enteros. */
export const tariffInputSchema = z.object({
  commissionRate: z.number({ error: 'Escribe el porcentaje' }).min(0, { error: 'No puede ser negativo' }).max(100, { error: 'Hasta 100 %' }),
  badgeMonthly: z.number({ error: 'Escribe el monto' }).int({ error: 'En córdobas, sin decimales' }).min(0).max(1_000_000),
  couponFee: z.number({ error: 'Escribe el monto' }).int({ error: 'En córdobas, sin decimales' }).min(0).max(1_000_000),
})

export const loginSchema = z.object({
  email: z.email({ error: 'Escribe un correo válido' }),
  password: z.string().min(1, { error: 'Escribe tu contraseña' }),
})
