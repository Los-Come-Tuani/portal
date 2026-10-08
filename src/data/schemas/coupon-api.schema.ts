import { z } from 'zod'
import type { BenefitType, CampaignInput, CouponCampaign, CouponCode, Page } from '../models'
import { apiCitySchema, apiImageSchema, apiOptionSchema, apiPageSchema, toLocalDateTime, toPage } from './api-common'

/**
 * Campañas de cupones y cupones entregados como los habla el API (`coupon-campaign/`,
 * `coupon-redemption/` y `catalog/benefit-type/`; docs/agenda-y-recompensas.md del repo del API).
 */

export const apiBenefitTypeSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  label: z.string(),
  requires_amount: z.boolean(),
  is_percentage: z.boolean(),
})

const benefit = z.object({ type: apiOptionSchema, amount: z.number().nullable(), currency: z.string().nullable(), label: z.string() })

export const apiCampaignSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  terms: z.string(),
  benefit,
  cost_badges: z.number(),
  remaining: z.number(),
  expires_at: z.string(),
  image: apiImageSchema.nullable(),
  business: z.object({ id: z.string(), name: z.string(), city: apiCitySchema, place_id: z.string().nullable() }),
  status: z.enum(['active', 'sold_out', 'withdrawn', 'expired']),
  stock_total: z.number(),
  stock_delivered: z.number(),
  consumed: z.number(),
  withdrawn_at: z.string().nullable(),
  withdrawn_reason: z.string(),
  created_at: z.string(),
})

export const apiCampaignPageSchema = apiPageSchema(apiCampaignSchema)

export const apiCouponCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  campaign_id: z.string(),
  tourist_name: z.string(),
  status: z.enum(['valid', 'consumed', 'expired']),
  redeemed_at: z.string(),
  consumed_at: z.string().nullable(),
  expires_at: z.string(),
})

export const apiCouponCodePageSchema = apiPageSchema(apiCouponCodeSchema)

/** Los campos del API que en el formulario se llaman distinto. */
export const CAMPAIGN_FORM_FIELDS = {
  expiresAt: 'expiresOn',
  imageKey: 'image',
} as const

export function toBenefitType(api: z.infer<typeof apiBenefitTypeSchema>): BenefitType {
  return { code: api.code, label: api.label, requiresAmount: api.requires_amount, isPercentage: api.is_percentage }
}

export function toCampaign(api: z.infer<typeof apiCampaignSchema>): CouponCampaign {
  return {
    id: api.id,
    title: api.title,
    description: api.description,
    terms: api.terms,
    benefit: api.benefit,
    costBadges: api.cost_badges,
    remaining: api.remaining,
    expiresAt: toLocalDateTime(api.expires_at),
    image: api.image,
    business: { id: api.business.id, name: api.business.name, city: api.business.city.name, placeId: api.business.place_id },
    status: api.status,
    stockTotal: api.stock_total,
    stockDelivered: api.stock_delivered,
    consumed: api.consumed,
    withdrawnAt: api.withdrawn_at ? toLocalDateTime(api.withdrawn_at) : null,
    withdrawnReason: api.withdrawn_reason,
    createdAt: toLocalDateTime(api.created_at),
  }
}

export const toCampaignPage = (api: z.infer<typeof apiCampaignPageSchema>): Page<CouponCampaign> => toPage(api, toCampaign)

export function toCouponCode(api: z.infer<typeof apiCouponCodeSchema>): CouponCode {
  return {
    id: api.id,
    code: api.code,
    title: api.title,
    campaignId: api.campaign_id,
    touristName: api.tourist_name,
    status: api.status,
    redeemedAt: toLocalDateTime(api.redeemed_at),
    consumedAt: api.consumed_at ? toLocalDateTime(api.consumed_at) : null,
    expiresAt: toLocalDateTime(api.expires_at),
  }
}

export const toCouponCodePage = (api: z.infer<typeof apiCouponCodePageSchema>): Page<CouponCode> => toPage(api, toCouponCode)

/** El último día en que se canjea, hasta el final de ese día en Managua. */
export const expiresAtOf = (date: string) => `${date}T23:59:59-06:00`

/** `POST coupon-campaign/`: el monto sólo va si el tipo lo pide. */
export function campaignBody(input: CampaignInput, benefitType: Pick<BenefitType, 'requiresAmount'> | undefined) {
  return {
    benefit_type: input.benefitType,
    title: input.title.trim(),
    description: input.description.trim(),
    terms: input.terms.trim(),
    ...(benefitType?.requiresAmount && input.benefitAmount !== null ? { benefit_amount: input.benefitAmount } : {}),
    cost_badges: input.costBadges,
    stock_total: input.stockTotal,
    expires_at: expiresAtOf(input.expiresOn),
    ...(input.image ? { image_key: input.image.key } : {}),
  }
}

/**
 * `PATCH coupon-campaign/{id}/`: lo que se corrige. El beneficio y el costo no cambian; la foto sólo
 * viaja si es otra (una clave nueva) o si se quitó (`null`).
 */
export function campaignPatch(input: CampaignInput, current: Pick<CouponCampaign, 'image'>) {
  const imageChanged = (input.image?.key ?? null) !== (current.image?.key ?? null)
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    terms: input.terms.trim(),
    stock_total: input.stockTotal,
    expires_at: expiresAtOf(input.expiresOn),
    ...(imageChanged ? { image_key: input.image?.key ?? null } : {}),
  }
}

/** El código como lo dicta el turista: sin espacios ni guiones, en mayúsculas. */
export const normalizeCouponCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
