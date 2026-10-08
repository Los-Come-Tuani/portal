import { describe, expect, it } from 'vitest'
import {
  apiPaymentPageSchema,
  apiStatementSchema,
  apiTariffSchema,
  apiWithdrawalSchema,
  pricingBody,
  tariffInputOf,
  toPaymentPage,
  toStatement,
  toTariff,
  toWithdrawal,
} from './finance-api.schema'

const payment = {
  id: 'p1',
  booking_id: 'b1',
  amount: 600,
  gateway: 'manual',
  status: 'pending',
  reference: '',
  instructions: 'Transfiere a…',
  tourist_name: 'Ana',
  guide_name: 'Pedro',
  created_at: '2026-10-07T15:00:00Z',
  confirmed_at: null,
  refunded_at: null,
}

const withdrawal = {
  id: 'w1',
  amount: 1800,
  status: 'pending',
  bank_account: { id: 'a1', bank: 'BANPRO', holder: 'Pedro López', account_type: 'ahorro', last4: '5567', effective_at: '2026-10-01T15:00:00Z' },
  reference: '',
  note: '',
  requested_at: '2026-10-07T16:00:00Z',
  resolved_at: null,
  guide_name: 'Pedro López',
  account_number: null,
}

describe('los pagos de las reservas', () => {
  it('pasan con su estado y la hora de Managua', () => {
    const page = toPaymentPage(apiPaymentPageSchema.parse({ next: false, previous: false, elements: 1, pages: 1, current: 1, results: [payment] }))
    expect(page.results[0]).toMatchObject({ bookingId: 'b1', amount: 600, status: 'pending', touristName: 'Ana', createdAt: '2026-10-07T09:00:00.000', confirmedAt: null })
  })

  it('rechaza un estado que el portal no conoce', () => {
    expect(apiPaymentPageSchema.safeParse({ next: false, previous: false, elements: 1, pages: 1, current: 1, results: [{ ...payment, status: 'paid' }] }).success).toBe(false)
  })
})

describe('los retiros de los guías', () => {
  it('sin billing.manage el número completo llega nulo; con él, completo', () => {
    expect(toWithdrawal(apiWithdrawalSchema.parse(withdrawal))).toMatchObject({ accountNumber: null, bankAccount: { last4: '5567', accountType: 'ahorro' } })
    expect(toWithdrawal(apiWithdrawalSchema.parse({ ...withdrawal, account_number: '1001-2034-5567' })).accountNumber).toBe('1001-2034-5567')
  })
})

describe('las tarifas', () => {
  const tariffs = [
    { code: 'comision_reserva', label: 'Comisión', value: 15, unit: 'percent', updated_at: '2026-09-01T12:00:00Z' },
    { code: 'insignia_mensual', label: 'Insignia', value: 300, unit: 'nio', updated_at: '2026-09-01T12:00:00Z' },
    { code: 'cupon_validado', label: 'Cupón', value: 10, unit: 'nio', updated_at: '2026-09-01T12:00:00Z' },
  ].map((item) => toTariff(apiTariffSchema.parse(item)))

  it('se editan por su código', () => {
    expect(tariffInputOf(tariffs)).toEqual({ commissionRate: 15, badgeMonthly: 300, couponFee: 10 })
  })

  it('sólo se mandan las que cambiaron', () => {
    const current = tariffInputOf(tariffs)
    expect(pricingBody({ ...current, couponFee: 12 }, current)).toEqual({ coupon_fee: 12 })
    expect(pricingBody(current, current)).toEqual({})
  })
})

describe('un estado de cuenta', () => {
  it('trae sus líneas con el precio unitario', () => {
    const statement = toStatement(
      apiStatementSchema.parse({
        id: 's1',
        business_id: 'c1',
        business_name: 'Café La Merced',
        period: '2026-09-01',
        total: 320,
        status: 'pending',
        lines: [
          { concept: 'insignia_mensual', description: 'Insignia de Café La Merced', quantity: 1, unit_price: 300, amount: 300 },
          { concept: 'cupon_validado', description: 'Cupones validados', quantity: 2, unit_price: 10, amount: 20 },
        ],
        issued_at: '2026-10-01T12:00:00Z',
        paid_at: null,
        reference: '',
      }),
    )
    expect(statement).toMatchObject({ period: '2026-09-01', total: 320, status: 'pending', paidAt: null })
    expect(statement.lines[1]).toEqual({ concept: 'cupon_validado', description: 'Cupones validados', quantity: 2, unitPrice: 10, amount: 20 })
  })
})
