import type { BadgePack } from './badges'
import type { ISODate, LocalDateTime } from './common'

export type ChargeKind = 'coupon_fee' | 'badge_activation' | 'badge_campaign' | 'assisted_onboarding'

export const CHARGE_KIND_LABELS: Record<ChargeKind, string> = {
  coupon_fee: 'Cupones canjeados',
  badge_activation: 'Insignia activada',
  badge_campaign: 'Campaña de insignias',
  assisted_onboarding: 'Alta asistida',
}

export interface StatementLine {
  id: string
  date: ISODate
  kind: ChargeKind
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

/** `open`: el mes en curso. `due`: cerrado y sin pagar. `paid`: pagado. */
export type StatementStatus = 'open' | 'due' | 'paid'

export const STATEMENT_STATUS_LABELS: Record<StatementStatus, string> = {
  open: 'Mes en curso',
  due: 'Por pagar',
  paid: 'Pagado',
}

/** Estado de cuenta mensual de una organización con K'Plan. */
export interface Statement {
  id: string
  organizationId: string
  /** `"2026-09"` */
  period: string
  lines: StatementLine[]
  total: number
  status: StatementStatus
  dueDate: ISODate
  paidAt: LocalDateTime | null
}

/** Tarifas de K'Plan; las define el admin. */
export interface Pricing {
  /** C$ por cada cupón canjeado (validado por el negocio). */
  couponFee: number
  /** C$ al mes por lugar con la insignia activada. */
  badgeActivationMonthly: number
  badgePacks: BadgePack[]
  /** C$ una sola vez, si el equipo llenó la solicitud por la organización y se marcó cobrarla. */
  assistedOnboardingFee: number
  updatedAt: LocalDateTime
}

export type PricingInput = Omit<Pricing, 'updatedAt'>
