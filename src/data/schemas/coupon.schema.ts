import { z } from 'zod'
import type { ISODate } from '@/lib/dates'
import type { BenefitType } from '../models'
import { isoDateSchema, photoSchema } from './common'

const count = (max: number, label: string) =>
  z
    .number({ error: `Escribe ${label}` })
    .int({ error: 'Sin decimales' })
    .min(1, { error: 'Al menos 1' })
    .max(max, { error: `Hasta ${max.toLocaleString('es-NI')}` })

/**
 * Las reglas de una campaña de cupones, las mismas del API: el descuento por porcentaje no pasa de
 * 100, los que llevan monto lo exigen, la fecha límite es futura y no se reparten menos cupones de
 * los que ya se entregaron.
 */
export function campaignInputSchema({ benefitTypes, today, delivered = 0 }: { benefitTypes: readonly BenefitType[]; today: ISODate; delivered?: number }) {
  return z
    .object({
      benefitType: z.string().min(1, { error: 'Elige qué da el cupón' }),
      title: z.string().trim().min(3, { error: 'Escribe el nombre del cupón' }).max(80, { error: 'Hasta 80 letras' }),
      description: z.string().trim().max(1000, { error: 'Hasta 1000 letras' }),
      terms: z.string().trim().max(1000, { error: 'Hasta 1000 letras' }),
      benefitAmount: z.number({ error: 'Escribe el monto' }).positive({ error: 'Tiene que ser mayor que cero' }).nullable(),
      costBadges: count(1000, 'cuántas insignias cuesta'),
      stockTotal: count(100_000, 'cuántos cupones hay'),
      expiresOn: isoDateSchema,
      image: photoSchema.nullable(),
    })
    .superRefine((value, context) => {
      const type = benefitTypes.find((item) => item.code === value.benefitType)
      if (type?.requiresAmount) {
        if (value.benefitAmount === null || Number.isNaN(value.benefitAmount)) {
          context.addIssue({ code: 'custom', path: ['benefitAmount'], message: type.isPercentage ? 'Escribe el porcentaje' : 'Escribe el monto en córdobas' })
        } else if (type.isPercentage && value.benefitAmount > 100) {
          context.addIssue({ code: 'custom', path: ['benefitAmount'], message: 'Un porcentaje no pasa de 100' })
        }
      }
      if (value.expiresOn < today) context.addIssue({ code: 'custom', path: ['expiresOn'], message: 'La fecha límite tiene que ser hoy o después' })
      if (value.stockTotal < delivered) {
        context.addIssue({ code: 'custom', path: ['stockTotal'], message: `Ya se entregaron ${delivered}: no pueden ser menos` })
      }
    })
}

/** Un código completo: ocho letras y números, sin `I`, `O`, `0` ni `1`. */
export const COUPON_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/
