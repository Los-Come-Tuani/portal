import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { MonthlyStatementStatus, PaymentStatus, TariffInput, WithdrawalStatus } from '../models'
import {
  apiPaymentPageSchema,
  apiPaymentSchema,
  apiStatementPageSchema,
  apiStatementSchema,
  apiTariffSchema,
  apiWithdrawalPageSchema,
  apiWithdrawalSchema,
  pricingBody,
  toPayment,
  toPaymentPage,
  toStatement,
  toStatementPage,
  toTariff,
  toWithdrawal,
  toWithdrawalPage,
} from '../schemas/finance-api.schema'

interface PageQuery {
  page?: number
  pageSize?: number
}

export interface PaymentFilters extends PageQuery {
  status?: PaymentStatus
}

export interface WithdrawalFilters extends PageQuery {
  status?: WithdrawalStatus
}

export interface StatementFilters extends PageQuery {
  status?: MonthlyStatementStatus
  businessId?: string
}

const reference = (value: string) => ({ reference: value.trim() })

/**
 * Las finanzas del portal (docs/finanzas.md del repo del API): el equipo con `billing.view` ve y con
 * `billing.manage` actúa; el comercio ve sus propios estados de cuenta.
 */
export const billingRepository = {
  /** Del más viejo al más nuevo. */
  payments: async ({ status, page = 1, pageSize = 20 }: PaymentFilters = {}) =>
    toPaymentPage(apiPaymentPageSchema.parse(await http.get<unknown>(endpoints.payment.list, { query: { status, page, page_size: pageSize } }))),

  /** Lo da por pagado con el número de la transferencia; avisa al turista. */
  confirmPayment: async (paymentId: string, ref: string) =>
    toPayment(apiPaymentSchema.parse(await http.post<unknown>(endpoints.payment.confirm(paymentId), { body: reference(ref) }))),

  /** Un pago por reembolsar que ya se devolvió; avisa al turista. */
  refundPayment: async (paymentId: string, ref: string) =>
    toPayment(apiPaymentSchema.parse(await http.post<unknown>(endpoints.payment.refund(paymentId), { body: reference(ref) }))),

  withdrawals: async ({ status, page = 1, pageSize = 20 }: WithdrawalFilters = {}) =>
    toWithdrawalPage(apiWithdrawalPageSchema.parse(await http.get<unknown>(endpoints.guideWithdrawal.list, { query: { status, page, page_size: pageSize } }))),

  payWithdrawal: async (withdrawalId: string, ref: string) =>
    toWithdrawal(apiWithdrawalSchema.parse(await http.post<unknown>(endpoints.guideWithdrawal.pay(withdrawalId), { body: reference(ref) }))),

  /** No se pagó: el monto vuelve al saldo del guía. La nota es obligatoria. */
  rejectWithdrawal: async (withdrawalId: string, note: string) =>
    toWithdrawal(apiWithdrawalSchema.parse(await http.post<unknown>(endpoints.guideWithdrawal.reject(withdrawalId), { body: { note: note.trim() } }))),

  tariffs: async () => z.array(apiTariffSchema).parse(await http.get<unknown>(endpoints.pricing)).map(toTariff),

  updateTariffs: async (input: TariffInput, current: TariffInput) =>
    z.array(apiTariffSchema).parse(await http.put<unknown>(endpoints.pricing, { body: pricingBody(input, current) })).map(toTariff),

  /** Del mes más reciente. */
  statements: async ({ status, businessId, page = 1, pageSize = 20 }: StatementFilters = {}) =>
    toStatementPage(
      apiStatementPageSchema.parse(await http.get<unknown>(endpoints.billing.statements, { query: { status, business_id: businessId, page, page_size: pageSize } })),
    ),

  /** Lo cobró fuera de línea. */
  payStatement: async (statementId: string, ref: string) =>
    toStatement(apiStatementSchema.parse(await http.post<unknown>(endpoints.billing.pay(statementId), { body: reference(ref) }))),
}
