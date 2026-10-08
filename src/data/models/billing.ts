import type { BadgePack } from './badges'
import type { ISODate, LocalDateTime } from './common'

// ── Cobros, retiros, tarifas y estados de cuenta del API (F8, docs/finanzas.md) ──

export type PaymentStatus = 'pending' | 'confirmed' | 'refund_due' | 'refunded' | 'void'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Por confirmar',
  confirmed: 'Pagado',
  refund_due: 'Por reembolsar',
  refunded: 'Reembolsado',
  void: 'Anulado',
}

/** El cobro de una reserva: con la pasarela manual, el equipo con `billing.manage` lo confirma. */
export interface BookingPayment {
  id: string
  bookingId: string
  /** Córdobas. */
  amount: number
  gateway: string
  status: PaymentStatus
  /** El número de la transferencia o de la operación. */
  reference: string
  instructions: string
  touristName: string
  guideName: string
  createdAt: LocalDateTime
  confirmedAt: LocalDateTime | null
  refundedAt: LocalDateTime | null
}

export type WithdrawalStatus = 'pending' | 'paid' | 'rejected'

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: 'Por pagar',
  paid: 'Pagado',
  rejected: 'Rechazado',
}

export const ACCOUNT_TYPE_LABELS = { ahorro: 'Ahorro', corriente: 'Corriente' } as const

/** Lo que un guía pidió retirar de su saldo a su cuenta; el equipo deposita y lo marca pagado. */
export interface GuideWithdrawal {
  id: string
  amount: number
  status: WithdrawalStatus
  bankAccount: { bank: string; holder: string; accountType: keyof typeof ACCOUNT_TYPE_LABELS; last4: string }
  reference: string
  note: string
  requestedAt: LocalDateTime
  resolvedAt: LocalDateTime | null
  guideName: string
  /** El número completo, sólo para quien tiene `billing.manage`. */
  accountNumber: string | null
}

/** Una tarifa: la comisión de cada reserva (`percent`) o un monto en córdobas (`nio`). */
export interface Tariff {
  code: string
  label: string
  value: number
  unit: 'percent' | 'nio'
  updatedAt: LocalDateTime
}

/** `PUT pricing/`: sólo cambian las que llegan. */
export interface TariffInput {
  commissionRate: number
  badgeMonthly: number
  couponFee: number
}

export type MonthlyStatementStatus = 'pending' | 'paid' | 'void'

export const MONTHLY_STATEMENT_STATUS_LABELS: Record<MonthlyStatementStatus, string> = {
  pending: 'Por pagar',
  paid: 'Pagado',
  void: 'Anulado',
}

/** El estado de cuenta mensual de un comercio: la insignia de su lugar y los cupones que validó. */
export interface MonthlyStatement {
  id: string
  businessId: string
  businessName: string
  /** El primer día del mes que cobra: `2026-09-01`. */
  period: ISODate
  total: number
  status: MonthlyStatementStatus
  lines: { concept: string; description: string; quantity: number; unitPrice: number; amount: number }[]
  issuedAt: LocalDateTime
  paidAt: LocalDateTime | null
  reference: string
}

// ── El modelo de demo anterior: lo leen todavía las insignias de la demo ──

/** Tarifas de la demo anterior (activaciones y paquetes de insignias). */
export interface Pricing {
  couponFee: number
  badgeActivationMonthly: number
  badgePacks: BadgePack[]
  assistedOnboardingFee: number
  updatedAt: LocalDateTime
}
