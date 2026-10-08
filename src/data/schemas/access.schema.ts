import { z } from 'zod'
import { PERMISSIONS } from '../models/access'

export const staffRoleInputSchema = z.object({
  name: z.string().trim().min(3, { error: 'Escribe el nombre del rol' }).max(40),
  description: z.string().trim().min(8, { error: 'Explica en una línea qué hace este rol' }).max(140),
  permissions: z.array(z.enum(PERMISSIONS)).min(1, { error: 'Marca al menos un permiso' }),
  requiresTwoFactor: z.boolean(),
})

export const staffInviteSchema = z.object({
  name: z.string().trim().min(3, { error: 'Escribe su nombre' }).max(80),
  email: z.email({ error: 'Escribe un correo válido' }),
  staffRoleId: z.string().min(1, { error: 'Elige un rol' }),
})