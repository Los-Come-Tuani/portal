/**
 * Las finanzas en el backend de demo, con el formato y las reglas del API (docs/finanzas.md del repo
 * del API): los pagos de las reservas, los retiros de los guías, las tarifas y los estados de cuenta
 * de los comercios.
 */
import { addDays, addMonths, monthKey, toLocalDateTime, type ISODate, type LocalDateTime } from '@/lib/dates'
import type { MonthlyStatementStatus, Organization, PaymentStatus, WithdrawalStatus } from '../../models'
import { wireInstant } from './places'

export interface MockPayment {
  id: string
  bookingId: string
  amount: number
  status: PaymentStatus
  reference: string
  touristName: string
  guideName: string
  createdAt: LocalDateTime
  confirmedAt: LocalDateTime | null
  refundedAt: LocalDateTime | null
}

export interface MockWithdrawal {
  id: string
  amount: number
  status: WithdrawalStatus
  bank: string
  holder: string
  accountType: 'ahorro' | 'corriente'
  accountNumber: string
  reference: string
  note: string
  requestedAt: LocalDateTime
  resolvedAt: LocalDateTime | null
  guideName: string
}

export interface MockTariff {
  code: string
  label: string
  value: number
  unit: 'percent' | 'nio'
  updatedAt: LocalDateTime
}

export interface MockStatement {
  id: string
  businessId: string
  businessName: string
  period: ISODate
  status: MonthlyStatementStatus
  lines: { concept: string; description: string; quantity: number; unitPrice: number; amount: number }[]
  issuedAt: LocalDateTime
  paidAt: LocalDateTime | null
  reference: string
}

export interface MockFinance {
  payments: MockPayment[]
  withdrawals: MockWithdrawal[]
  tariffs: MockTariff[]
  statements: MockStatement[]
}

export const PAYMENT_INSTRUCTIONS = "El equipo de K'Plan te escribirá para confirmar el pago por transferencia."

const local = (value: LocalDateTime | null) => (value ? wireInstant(value) : null)

export function wirePayment(payment: MockPayment) {
  return {
    id: payment.id,
    booking_id: payment.bookingId,
    amount: payment.amount,
    gateway: 'manual',
    status: payment.status,
    reference: payment.reference,
    instructions: payment.status === 'pending' ? PAYMENT_INSTRUCTIONS : '',
    tourist_name: payment.touristName,
    guide_name: payment.guideName,
    created_at: wireInstant(payment.createdAt),
    confirmed_at: local(payment.confirmedAt),
    refunded_at: local(payment.refundedAt),
  }
}

/** El número completo sólo para quien paga (`billing.manage`). */
export function wireWithdrawal(withdrawal: MockWithdrawal, fullNumber: boolean) {
  return {
    id: withdrawal.id,
    amount: withdrawal.amount,
    status: withdrawal.status,
    bank_account: {
      id: `${withdrawal.id}-cuenta`,
      bank: withdrawal.bank,
      holder: withdrawal.holder,
      account_type: withdrawal.accountType,
      last4: withdrawal.accountNumber.replace(/\D/g, '').slice(-4),
      effective_at: wireInstant(withdrawal.requestedAt),
    },
    reference: withdrawal.reference,
    note: withdrawal.note,
    requested_at: wireInstant(withdrawal.requestedAt),
    resolved_at: local(withdrawal.resolvedAt),
    guide_name: withdrawal.guideName,
    account_number: fullNumber ? withdrawal.accountNumber : null,
  }
}

export const wireTariff = (tariff: MockTariff) => ({ code: tariff.code, label: tariff.label, value: tariff.value, unit: tariff.unit, updated_at: wireInstant(tariff.updatedAt) })

export function wireStatement(statement: MockStatement) {
  return {
    id: statement.id,
    business_id: statement.businessId,
    business_name: statement.businessName,
    period: statement.period,
    total: statement.lines.reduce((sum, line) => sum + line.amount, 0),
    status: statement.status,
    lines: statement.lines.map((line) => ({ concept: line.concept, description: line.description, quantity: line.quantity, unit_price: line.unitPrice, amount: line.amount })),
    issued_at: wireInstant(statement.issuedAt),
    paid_at: local(statement.paidAt),
    reference: statement.reference,
  }
}

/**
 * Unos pagos, retiros y estados de cuenta de ejemplo: hay algo por confirmar, por reembolsar, por
 * pagar y por cobrar para probar cada acción del equipo.
 */
export function seedFinance(today: ISODate, organizations: readonly Organization[], guides: readonly string[], tourists: readonly string[]): MockFinance {
  const at = (days: number, minutes: number) => toLocalDateTime(addDays(today, -days), minutes)
  const guide = (index: number) => guides[index % Math.max(1, guides.length)] ?? 'Guía certificado'
  const tourist = (index: number) => tourists[index % Math.max(1, tourists.length)] ?? 'Turista'
  const statuses: PaymentStatus[] = ['pending', 'pending', 'confirmed', 'refund_due', 'confirmed', 'refunded', 'void']
  const payments = statuses.map(
    (status, index): MockPayment => ({
      id: `pago-${index + 1}`,
      bookingId: `reserva-${index + 1}`,
      amount: 250 * (index + 1),
      status,
      reference: status === 'confirmed' || status === 'refunded' ? `TRF-${4810 + index}` : '',
      touristName: tourist(index),
      guideName: guide(index),
      createdAt: at(10 - index, 9 * 60 + index * 25),
      confirmedAt: status === 'confirmed' || status === 'refund_due' || status === 'refunded' ? at(9 - index, 15 * 60) : null,
      refundedAt: status === 'refunded' ? at(2, 11 * 60) : null,
    }),
  )
  const withdrawals: MockWithdrawal[] = [
    { status: 'pending' as const, amount: 1800, days: 1 },
    { status: 'pending' as const, amount: 950, days: 0 },
    { status: 'paid' as const, amount: 2400, days: 12 },
    { status: 'rejected' as const, amount: 600, days: 20 },
  ].map((item, index) => ({
    id: `retiro-${index + 1}`,
    amount: item.amount,
    status: item.status,
    bank: index % 2 === 0 ? 'BANPRO' : 'LAFISE',
    holder: guide(index),
    accountType: index % 2 === 0 ? 'ahorro' : 'corriente',
    accountNumber: `1001-${2034 + index}-${5567 + index * 11}`,
    reference: item.status === 'paid' ? 'DEP-2291' : '',
    note: item.status === 'rejected' ? 'La cuenta no está a nombre del guía.' : '',
    requestedAt: at(item.days, 10 * 60 + index * 30),
    resolvedAt: item.status === 'pending' ? null : at(item.days - 1, 14 * 60),
    guideName: guide(index),
  }))
  const updatedAt = at(40, 9 * 60)
  const tariffs: MockTariff[] = [
    { code: 'comision_reserva', label: 'Comisión por reserva', value: 15, unit: 'percent', updatedAt },
    { code: 'cupon_validado', label: 'Cupón validado', value: 10, unit: 'nio', updatedAt },
    { code: 'insignia_mensual', label: 'Insignia mensual', value: 300, unit: 'nio', updatedAt },
  ]
  const lastMonth = addMonths(monthKey(today), -1)
  const twoMonths = addMonths(monthKey(today), -2)
  const statements = organizations
    .filter((organization) => organization.type === 'negocio' && organization.status === 'active')
    .slice(0, 4)
    .flatMap((organization, index): MockStatement[] =>
      [lastMonth, twoMonths].map((period, offset) => {
        const coupons = 2 + ((index + offset) % 4)
        return {
          id: `estado-${organization.id}-${period}`,
          businessId: organization.id,
          businessName: organization.name,
          period: `${period}-01`,
          status: offset === 0 && index % 2 === 0 ? 'pending' : 'paid',
          lines: [
            { concept: 'insignia_mensual', description: `Insignia de ${organization.name}`, quantity: 1, unitPrice: 300, amount: 300 },
            { concept: 'cupon_validado', description: 'Cupones validados', quantity: coupons, unitPrice: 10, amount: coupons * 10 },
          ],
          issuedAt: toLocalDateTime(`${addMonths(period, 1)}-01`, 6 * 60),
          paidAt: offset === 0 && index % 2 === 0 ? null : toLocalDateTime(`${addMonths(period, 1)}-08`, 11 * 60),
          reference: offset === 0 && index % 2 === 0 ? '' : 'Efectivo',
        }
      }),
    )
  return { payments, withdrawals, tariffs, statements }
}
