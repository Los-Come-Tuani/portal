import type { ISODate, LocalDateTime, Photo } from './common'

// ── Campañas y cupones del API (F6, docs/agenda-y-recompensas.md) ─────────

/** En la tienda de la app sólo está la activa con cupos. */
export type CouponCampaignStatus = 'active' | 'sold_out' | 'withdrawn' | 'expired'

export const COUPON_CAMPAIGN_STATUS_LABELS: Record<CouponCampaignStatus, string> = {
  active: 'En la tienda',
  sold_out: 'Agotada',
  withdrawn: 'Retirada',
  expired: 'Vencida',
}

/** Un comercio tiene hasta tres campañas activas a la vez. */
export const MAX_ACTIVE_CAMPAIGNS = 3

/** Un tipo de beneficio del catálogo (`catalog/benefit-type/`). */
export interface BenefitType {
  code: string
  label: string
  /** La campaña dice cuánto: el porcentaje o los córdobas. */
  requiresAmount: boolean
  isPercentage: boolean
}

export interface CouponBenefit {
  type: { code: string; label: string }
  /** El porcentaje o los córdobas; `null` si el tipo no lleva monto. */
  amount: number | null
  currency: string | null
  /** Listo para mostrar: "10% de descuento", "Producto gratis". */
  label: string
}

/** Una campaña de cupones de un comercio: el turista canjea insignias por un cupón. */
export interface CouponCampaign {
  id: string
  title: string
  description: string
  terms: string
  benefit: CouponBenefit
  /** Cuántas insignias cuesta en la app. */
  costBadges: number
  /** Cuántos cupones quedan. */
  remaining: number
  expiresAt: LocalDateTime
  image: Photo | null
  business: { id: string; name: string; city: string; placeId: string | null }
  status: CouponCampaignStatus
  stockTotal: number
  stockDelivered: number
  /** Cuántos se usaron en el mostrador. */
  consumed: number
  withdrawnAt: LocalDateTime | null
  withdrawnReason: string
  createdAt: LocalDateTime
}

/** Lo que se publica; al corregir, el beneficio y el costo ya no cambian. */
export interface CampaignInput {
  benefitType: string
  title: string
  description: string
  terms: string
  benefitAmount: number | null
  costBadges: number
  stockTotal: number
  /** El último día en que se puede canjear. */
  expiresOn: ISODate
  image: Photo | null
}

export type CouponCodeStatus = 'valid' | 'consumed' | 'expired'

export const COUPON_CODE_STATUS_LABELS: Record<CouponCodeStatus, string> = {
  valid: 'Por usar',
  consumed: 'Usado',
  expired: 'Vencido',
}

/** Un cupón que un turista canjeó: el código que muestra en el mostrador. */
export interface CouponCode {
  id: string
  /** Ocho caracteres, sin `I`, `O`, `0` ni `1`. */
  code: string
  title: string
  campaignId: string
  touristName: string
  status: CouponCodeStatus
  redeemedAt: LocalDateTime
  consumedAt: LocalDateTime | null
  expiresAt: LocalDateTime
}

// ── El formato de los cupones de ejemplo de la demo (coupons.json y portal_coupons.json) ──

export type CouponStatus = 'active' | 'paused'

/** coupons.json de la app, más los campos del portal: de aquí salen las campañas de la demo. */
export interface Coupon {
  id: string
  title: string
  description: string
  /** `"10% de descuento"`, `"Gratis"`, `"Regalo"` */
  discountLabel: string
  /** Costo en insignias del saldo del turista. */
  cost: number
  image: string
  /** `null` = cupón de K'Plan. */
  organizationId: string | null
  /** Lugar donde se canjea; `null` = cualquiera de la organización. */
  stopId: string | null
  status: CouponStatus
  validUntil: ISODate | null
  /** Canjes máximos; `null` = sin límite. */
  maxRedemptions: number | null
  terms: string
  createdAt: ISODate
}
