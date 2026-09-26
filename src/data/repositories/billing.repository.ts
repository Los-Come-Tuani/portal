import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { Pricing, PricingInput, Statement } from '../models'

export const billingRepository = {
  listStatements: (organizationId?: string) =>
    http.get<Statement[]>(endpoints.billing.statements, { query: { organizationId } }),
  pay: (statementId: string) => http.post<Statement>(endpoints.billing.pay(statementId)),

  getPricing: () => http.get<Pricing>(endpoints.pricing),
  updatePricing: (input: PricingInput) => http.put<Pricing>(endpoints.pricing, { body: input }),
}
