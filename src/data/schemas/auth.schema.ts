import { z } from 'zod'

/** Lo mismo que exige el API: ocho caracteres, una mayúscula y un número. */
export const newPasswordSchema = z
  .string()
  .min(8, { error: 'Usa al menos 8 caracteres' })
  .max(256, { error: 'Es demasiado larga' })
  .regex(/\p{Lu}/u, { error: 'Agrega una letra mayúscula' })
  .regex(/\p{Nd}/u, { error: 'Agrega un número' })

const emailSchema = z.email({ error: 'Escribe un correo válido' })

/** Seis dígitos de la app de autenticación, o un código de recuperación (`ABCD-EFGH-...`). */
export const twoFactorCodeSchema = z
  .string()
  .trim()
  .min(6, { error: 'Escribe el código de 6 dígitos o un código de recuperación' })
  .max(32, { error: 'El código es demasiado largo' })

export const twoFactorLoginSchema = z.object({ code: twoFactorCodeSchema })

/** Los seis dígitos que llegan por correo. */
const emailCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'El código tiene 6 dígitos' })

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: emailCodeSchema,
    password: newPasswordSchema,
    confirmation: z.string().min(1, { error: 'Repite la contraseña' }),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    error: 'Las contraseñas no coinciden',
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Escribe tu contraseña actual' }),
    password: newPasswordSchema,
    confirmation: z.string().min(1, { error: 'Repite la contraseña' }),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    error: 'Las contraseñas no coinciden',
  })
  .refine((value) => value.password !== value.currentPassword, {
    path: ['password'],
    error: 'La contraseña nueva tiene que ser distinta a la actual',
  })

export const confirmTwoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { error: 'Escribe los 6 dígitos que muestra tu app' }),
})

export const disableTwoFactorSchema = z.object({
  code: twoFactorCodeSchema,
  password: z.string().min(1, { error: 'Escribe tu contraseña' }),
})

export const regenerateCodesSchema = z.object({ code: twoFactorCodeSchema })
