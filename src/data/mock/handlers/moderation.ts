import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import { fail, paginate, parseBody, route } from '../http'
import { findDispute, wireDispute } from '../services/moderation'

/** La moderación del equipo, con las mismas rutas y reglas que el API. */
export const moderationRoutes = [
  route(
    'GET',
    endpoints.reviewDispute.list,
    ({ db, query }) => {
      const status = query.get('status')
      const shown = db.reviewDisputes
        .filter((dispute) => !status || dispute.status === status)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(wireDispute)
      return paginate(shown, query)
    },
    { permissions: ['content.moderate'] },
  ),
  route(
    'POST',
    endpoints.reviewDispute.resolve(':id'),
    ({ db, params, body }) => {
      const dispute = findDispute(db, params.id)
      if (!dispute) throw fail.notFound('No encontramos esa impugnación.')
      if (dispute.status !== 'pending') throw fail.conflict('Esa impugnación ya se resolvió.')
      const input = parseBody(z.object({ upheld: z.boolean(), note: z.string().max(1000).default('') }), body)
      dispute.status = input.upheld ? 'upheld' : 'rejected'
      dispute.hidden = input.upheld
      dispute.note = input.note.trim()
      dispute.resolvedAt = nowLocalDateTime()
      return wireDispute(dispute)
    },
    { permissions: ['content.moderate'] },
  ),
]
