import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import { fail, paginate, parseBody, requireUser, route } from '../http'
import { hasPermission } from '../services/access'
import { wirePayment, wireStatement, wireTariff, wireWithdrawal } from '../services/finance'
import { actorOrganization } from '../services/places'

const referenceBody = z.object({ reference: z.string().max(120).default('') })

const pricingBody = z.object({
  commission_rate: z.number().min(0).max(100).optional(),
  badge_monthly: z.number().min(0).max(1_000_000).optional(),
  coupon_fee: z.number().min(0).max(1_000_000).optional(),
})

const TARIFF_FIELDS = { commission_rate: 'comision_reserva', badge_monthly: 'insignia_mensual', coupon_fee: 'cupon_validado' } as const

/** Las finanzas, con las mismas rutas y permisos que el API (docs/finanzas.md). */
export const billingRoutes = [
  // El comercio también las lee: son lo que paga cada mes. Cambiarlas sigue siendo de `billing.manage`.
  route('GET', endpoints.pricing, (context) => {
    const { db } = context
    const user = requireUser(context)
    if (!hasPermission(db, user, ['billing.view']) && actorOrganization(db, user)?.type !== 'negocio') throw fail.forbidden()
    return db.finance.tariffs.map(wireTariff)
  }),
  route(
    'PUT',
    endpoints.pricing,
    ({ db, body }) => {
      const input = parseBody(pricingBody, body)
      const now = nowLocalDateTime()
      for (const [field, code] of Object.entries(TARIFF_FIELDS)) {
        const value = input[field as keyof typeof TARIFF_FIELDS]
        const tariff = db.finance.tariffs.find((item) => item.code === code)
        if (value !== undefined && tariff) Object.assign(tariff, { value, updatedAt: now })
      }
      return db.finance.tariffs.map(wireTariff)
    },
    { permissions: ['billing.manage'] },
  ),

  route(
    'GET',
    endpoints.payment.list,
    ({ db, query }) => {
      const status = query.get('status')
      const shown = db.finance.payments
        .filter((payment) => !status || payment.status === status)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(wirePayment)
      return paginate(shown, query)
    },
    { permissions: ['billing.view'] },
  ),
  route(
    'POST',
    endpoints.payment.confirm(':id'),
    ({ db, params, body }) => {
      const payment = db.finance.payments.find((item) => item.id === params.id)
      if (!payment) throw fail.notFound('No encontramos ese pago.')
      if (payment.status !== 'pending') throw fail.conflict('Ese pago no está pendiente.')
      payment.status = 'confirmed'
      payment.reference = parseBody(referenceBody, body ?? {}).reference.trim()
      payment.confirmedAt = nowLocalDateTime()
      return wirePayment(payment)
    },
    { permissions: ['billing.manage'] },
  ),
  route(
    'POST',
    endpoints.payment.refund(':id'),
    ({ db, params, body }) => {
      const payment = db.finance.payments.find((item) => item.id === params.id)
      if (!payment) throw fail.notFound('No encontramos ese pago.')
      if (payment.status !== 'refund_due') throw fail.conflict('Ese pago no está por reembolsar.')
      payment.status = 'refunded'
      payment.reference = parseBody(referenceBody, body ?? {}).reference.trim() || payment.reference
      payment.refundedAt = nowLocalDateTime()
      return wirePayment(payment)
    },
    { permissions: ['billing.manage'] },
  ),

  route(
    'GET',
    endpoints.guideWithdrawal.list,
    (context) => {
      const { db, query } = context
      const full = hasPermission(db, requireUser(context), ['billing.manage'])
      const status = query.get('status')
      const shown = db.finance.withdrawals
        .filter((withdrawal) => !status || withdrawal.status === status)
        .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
        .map((withdrawal) => wireWithdrawal(withdrawal, full))
      return paginate(shown, query)
    },
    { permissions: ['billing.view'] },
  ),
  route(
    'POST',
    endpoints.guideWithdrawal.pay(':id'),
    ({ db, params, body }) => {
      const withdrawal = db.finance.withdrawals.find((item) => item.id === params.id)
      if (!withdrawal) throw fail.notFound('No encontramos ese retiro.')
      if (withdrawal.status !== 'pending') throw fail.conflict('Ese retiro ya se resolvió.')
      withdrawal.status = 'paid'
      withdrawal.reference = parseBody(referenceBody, body ?? {}).reference.trim()
      withdrawal.resolvedAt = nowLocalDateTime()
      return wireWithdrawal(withdrawal, true)
    },
    { permissions: ['billing.manage'] },
  ),
  route(
    'POST',
    endpoints.guideWithdrawal.reject(':id'),
    ({ db, params, body }) => {
      const withdrawal = db.finance.withdrawals.find((item) => item.id === params.id)
      if (!withdrawal) throw fail.notFound('No encontramos ese retiro.')
      if (withdrawal.status !== 'pending') throw fail.conflict('Ese retiro ya se resolvió.')
      const { note } = parseBody(z.object({ note: z.string().trim().min(1, { error: 'Escribe el motivo.' }).max(500) }), body)
      withdrawal.status = 'rejected'
      withdrawal.note = note
      withdrawal.resolvedAt = nowLocalDateTime()
      return wireWithdrawal(withdrawal, true)
    },
    { permissions: ['billing.manage'] },
  ),

  // El comercio ve los suyos; el equipo con `billing.view`, todos. Los demás, 403.
  route('GET', endpoints.billing.statements, (context) => {
    const { db, query } = context
    const user = requireUser(context)
    const sees = hasPermission(db, user, ['billing.view'])
    const business = actorOrganization(db, user)
    if (!sees && business?.type !== 'negocio') throw fail.forbidden()
    const status = query.get('status')
    const businessId = query.get('business_id')
    const shown = db.finance.statements
      .filter((statement) => sees || statement.businessId === business?.id)
      .filter((statement) => !status || statement.status === status)
      .filter((statement) => !businessId || statement.businessId === businessId)
      .sort((a, b) => b.period.localeCompare(a.period) || a.businessName.localeCompare(b.businessName, 'es'))
      .map(wireStatement)
    return paginate(shown, query)
  }),
  route(
    'POST',
    endpoints.billing.pay(':id'),
    ({ db, params, body }) => {
      const statement = db.finance.statements.find((item) => item.id === params.id)
      if (!statement) throw fail.notFound('No encontramos ese estado de cuenta.')
      if (statement.status !== 'pending') throw fail.conflict('Ese estado de cuenta no está pendiente.')
      statement.status = 'paid'
      statement.reference = parseBody(referenceBody, body ?? {}).reference.trim()
      statement.paidAt = nowLocalDateTime()
      return wireStatement(statement)
    },
    { permissions: ['billing.manage'] },
  ),
]
