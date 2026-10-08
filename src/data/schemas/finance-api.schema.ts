import { z } from 'zod'
import type { BookingPayment, GuideWithdrawal, MonthlyStatement, Page, Tariff, TariffInput } from '../models'
import { apiPageSchema, toLocalDateTime, toPage } from './api-common'

/**
 * Cobros, retiros, tarifas y estados de cuenta como los habla el API (`payment/`,
 * `guide-withdrawal/`, `pricing/` y `billing/statement/`; docs/finanzas.md del repo del API).
 */

const instant = z.string()
const local = (value: string | null) => (value ? toLocalDateTime(value) : null)

export const apiPaymentSchema = z.object({
  id: z.string(),
  booking_id: z.string(),
  amount: z.number(),
  gateway: z.string(),
  status: z.enum(['pending', 'confirmed', 'refund_due', 'refunded', 'void']),
  reference: z.string(),
  instructions: z.string(),
  tourist_name: z.string(),
  guide_name: z.string(),
  created_at: instant,
  confirmed_at: instant.nullable(),
  refunded_at: instant.nullable(),
})

export const apiPaymentPageSchema = apiPageSchema(apiPaymentSchema)

export const apiWithdrawalSchema = z.object({
  id: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'paid', 'rejected']),
  bank_account: z.object({
    id: z.string(),
    bank: z.string(),
    holder: z.string(),
    account_type: z.enum(['ahorro', 'corriente']),
    last4: z.string(),
    effective_at: instant,
  }),
  reference: z.string(),
  note: z.string(),
  requested_at: instant,
  resolved_at: instant.nullable(),
  guide_name: z.string(),
  account_number: z.string().nullable(),
})

export const apiWithdrawalPageSchema = apiPageSchema(apiWithdrawalSchema)

export const apiTariffSchema = z.object({
  code: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.enum(['percent', 'nio']),
  updated_at: instant,
})

export const apiStatementSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  business_name: z.string(),
  period: z.string(),
  total: z.number(),
  status: z.enum(['pending', 'paid', 'void']),
  lines: z.array(z.object({ concept: z.string(), description: z.string(), quantity: z.number(), unit_price: z.number(), amount: z.number() })),
  issued_at: instant,
  paid_at: instant.nullable(),
  reference: z.string(),
})

export const apiStatementPageSchema = apiPageSchema(apiStatementSchema)

export function toPayment(api: z.infer<typeof apiPaymentSchema>): BookingPayment {
  return {
    id: api.id,
    bookingId: api.booking_id,
    amount: api.amount,
    gateway: api.gateway,
    status: api.status,
    reference: api.reference,
    instructions: api.instructions,
    touristName: api.tourist_name,
    guideName: api.guide_name,
    createdAt: toLocalDateTime(api.created_at),
    confirmedAt: local(api.confirmed_at),
    refundedAt: local(api.refunded_at),
  }
}

export const toPaymentPage = (api: z.infer<typeof apiPaymentPageSchema>): Page<BookingPayment> => toPage(api, toPayment)

export function toWithdrawal(api: z.infer<typeof apiWithdrawalSchema>): GuideWithdrawal {
  return {
    id: api.id,
    amount: api.amount,
    status: api.status,
    bankAccount: { bank: api.bank_account.bank, holder: api.bank_account.holder, accountType: api.bank_account.account_type, last4: api.bank_account.last4 },
    reference: api.reference,
    note: api.note,
    requestedAt: toLocalDateTime(api.requested_at),
    resolvedAt: local(api.resolved_at),
    guideName: api.guide_name,
    accountNumber: api.account_number,
  }
}

export const toWithdrawalPage = (api: z.infer<typeof apiWithdrawalPageSchema>): Page<GuideWithdrawal> => toPage(api, toWithdrawal)

export function toTariff(api: z.infer<typeof apiTariffSchema>): Tariff {
  return { code: api.code, label: api.label, value: api.value, unit: api.unit, updatedAt: toLocalDateTime(api.updated_at) }
}

export function toStatement(api: z.infer<typeof apiStatementSchema>): MonthlyStatement {
  return {
    id: api.id,
    businessId: api.business_id,
    businessName: api.business_name,
    period: api.period,
    total: api.total,
    status: api.status,
    lines: api.lines.map((line) => ({ concept: line.concept, description: line.description, quantity: line.quantity, unitPrice: line.unit_price, amount: line.amount })),
    issuedAt: toLocalDateTime(api.issued_at),
    paidAt: local(api.paid_at),
    reference: api.reference,
  }
}

export const toStatementPage = (api: z.infer<typeof apiStatementPageSchema>): Page<MonthlyStatement> => toPage(api, toStatement)

/** Los códigos de las tres tarifas y cómo se llaman al cambiarlas. */
export const TARIFF_CODES = { commission: 'comision_reserva', badge: 'insignia_mensual', coupon: 'cupon_validado' } as const

/** Las tarifas como las edita el formulario; una que falte queda en cero. */
export function tariffInputOf(tariffs: readonly Tariff[]): TariffInput {
  const value = (code: string) => tariffs.find((item) => item.code === code)?.value ?? 0
  return { commissionRate: value(TARIFF_CODES.commission), badgeMonthly: value(TARIFF_CODES.badge), couponFee: value(TARIFF_CODES.coupon) }
}

/** `PUT pricing/`: sólo las que cambiaron. */
export function pricingBody(input: TariffInput, current: TariffInput) {
  return {
    ...(input.commissionRate !== current.commissionRate ? { commission_rate: input.commissionRate } : {}),
    ...(input.badgeMonthly !== current.badgeMonthly ? { badge_monthly: input.badgeMonthly } : {}),
    ...(input.couponFee !== current.couponFee ? { coupon_fee: input.couponFee } : {}),
  }
}
