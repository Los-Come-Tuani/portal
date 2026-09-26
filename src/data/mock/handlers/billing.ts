import { nowLocalDateTime, todayISO } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import { pricingInputSchema } from '../../schemas/admin.schema'
import { fail, parseBody, requireUser, route } from '../http'
import { assertCanManage, scopeOrganization } from '../services/access'
import { buildStatements, parseStatementId } from '../services/statements'

export const billingRoutes = [
  route('GET', endpoints.billing.statements, (context) => {
    const user = requireUser(context)
    const organizationId = scopeOrganization(user, context.query.get('organizationId'))
    const today = todayISO()
    const organizations = organizationId
      ? context.db.organizations.filter((item) => item.id === organizationId)
      : context.db.organizations
    return organizations.flatMap((organization) => buildStatements(context.db, organization.id, today))
  }),
  route('POST', endpoints.billing.pay(':id'), (context) => {
    const user = requireUser(context)
    const parsed = parseStatementId(context.params.id)
    if (!parsed) throw fail.notFound('No encontramos ese estado de cuenta')
    assertCanManage(user, parsed.organizationId)
    const statement = buildStatements(context.db, parsed.organizationId, todayISO()).find(
      (item) => item.id === context.params.id,
    )
    if (!statement) throw fail.notFound('No encontramos ese estado de cuenta')
    if (statement.status === 'paid') throw fail.conflict('Este estado de cuenta ya está pagado.')
    if (statement.status === 'open') throw fail.conflict('El mes todavía no cierra: se paga a partir del día 1.')
    const paidAt = nowLocalDateTime()
    context.db.payments.push({ statementId: statement.id, paidAt })
    return { ...statement, status: 'paid', paidAt }
  }),

  route('GET', endpoints.pricing, (context) => {
    requireUser(context)
    return context.db.pricing
  }),
  route(
    'PUT',
    endpoints.pricing,
    (context) => {
      const input = parseBody(pricingInputSchema, context.body)
      context.db.pricing = { ...input, updatedAt: nowLocalDateTime() }
      return context.db.pricing
    },
    { roles: ['admin'] },
  ),
]
