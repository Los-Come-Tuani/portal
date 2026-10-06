import { z } from 'zod'
import { todayISO } from '@/lib/dates'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { DisableTwoFactorInput, TwoFactorSetup, TwoFactorStatus } from '../models'

const statusSchema = z.object({
  confirmed_at: z.string().nullable(),
  enabled: z.boolean(),
  pending: z.boolean(),
  recovery_codes: z.number(),
})
const setupSchema = z.object({ secret: z.string(), uri: z.string() })
const codesSchema = z.object({ codes: z.array(z.string()) })

/** El segundo factor (TOTP) de quien está dentro. */
export const securityRepository = {
  async twoFactorStatus(): Promise<TwoFactorStatus> {
    const status = statusSchema.parse(await http.get<unknown>(endpoints.auth.twoFactorStatus))
    return {
      enabled: status.enabled,
      pending: status.pending,
      confirmedAt: status.confirmed_at ? todayISO(new Date(status.confirmed_at)) : null,
      recoveryCodes: status.recovery_codes,
    }
  },

  /** Empieza a activar el 2FA: devuelve la clave y el texto del QR. Hasta confirmar no exige nada. */
  async startTwoFactor(): Promise<TwoFactorSetup> {
    return setupSchema.parse(await http.post<unknown>(endpoints.auth.twoFactorSetup))
  },

  /** Con un código de la app, activa el 2FA y entrega los códigos de recuperación (una sola vez). */
  async confirmTwoFactor(code: string): Promise<string[]> {
    return codesSchema.parse(await http.post<unknown>(endpoints.auth.twoFactorConfirm, { body: { code } })).codes
  },

  /** Reemplaza los códigos de recuperación por diez nuevos; los anteriores dejan de servir. */
  async regenerateRecoveryCodes(code: string): Promise<string[]> {
    return codesSchema.parse(await http.post<unknown>(endpoints.auth.twoFactorRecovery, { body: { code } })).codes
  },

  disableTwoFactor: ({ code, password }: DisableTwoFactorInput) =>
    http.post<void>(endpoints.auth.twoFactorDisable, { body: { code, password } }),
}
