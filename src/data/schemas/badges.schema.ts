import { z } from 'zod'
import { diffDays } from '@/lib/dates'
import { isoDateSchema } from './common'

export const MAX_CAMPAIGN_DAYS = 60

export const campaignInputSchema = z
  .object({
    stopId: z.string().min(1, { error: 'Elige el lugar' }),
    multiplier: z.union([z.literal(2), z.literal(3), z.literal(5)]),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    packId: z.string().min(1, { error: 'Elige un paquete' }),
  })
  .superRefine((value, context) => {
    const days = diffDays(value.startDate, value.endDate)
    if (days < 0) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'Tiene que terminar después de empezar' })
    } else if (days + 1 > MAX_CAMPAIGN_DAYS) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: `Máximo ${MAX_CAMPAIGN_DAYS} días por campaña` })
    }
  })

export const activationInputSchema = z.object({
  stopId: z.string().min(1, { error: 'Elige el lugar' }),
})
