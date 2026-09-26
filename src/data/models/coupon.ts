import type { ISODate, LocalDateTime } from './common'

export type CouponStatus = 'active' | 'paused'

/** coupons.json de la app, más los campos del portal. */
export interface Coupon {
  id: string
  title: string
  description: string
  /** `"10% de descuento"`, `"Gratis"`, `"Regalo"` */
  discountLabel: string
  /** Costo en insignias del saldo del turista. */
  cost: number
  image: string

  /* Portal */
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

export type CouponInput = Omit<Coupon, 'id' | 'createdAt'>

/**
 * `pending`: el turista lo pagó con insignias en la app y tiene su código.
 * `validated`: el negocio lo validó al atenderlo; aquí K'Plan cobra la tarifa.
 * `expired`: nunca se validó.
 */
export type RedemptionStatus = 'pending' | 'validated' | 'expired'

export interface CouponRedemption {
  id: string
  couponId: string
  organizationId: string | null
  /** Código que muestra el turista: `KP-7F3Q-9M2D`. */
  code: string
  touristName: string
  claimedAt: LocalDateTime
  validatedAt: LocalDateTime | null
  status: RedemptionStatus
  /** Tarifa fija cobrada por K'Plan al validar (C$), congelada en ese momento. */
  fee: number
}
