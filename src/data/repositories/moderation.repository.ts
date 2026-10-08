import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { DisputeStatus } from '../models'
import { apiDisputePageSchema, apiDisputeSchema, toDispute, toDisputePage } from '../schemas/moderation-api.schema'

export interface DisputeFilters {
  status?: DisputeStatus
  page?: number
  pageSize?: number
}

/** La moderación del equipo (docs/servicios.md del repo del API): las reseñas impugnadas. */
export const moderationRepository = {
  /** De la más vieja a la más nueva. */
  disputes: async ({ status, page = 1, pageSize = 20 }: DisputeFilters = {}) =>
    toDisputePage(apiDisputePageSchema.parse(await http.get<unknown>(endpoints.reviewDispute.list, { query: { status, page, page_size: pageSize } }))),

  /** `upheld`: se le da la razón a quien la impugnó y la reseña se oculta. */
  resolveDispute: async (disputeId: string, upheld: boolean, note: string) =>
    toDispute(apiDisputeSchema.parse(await http.post<unknown>(endpoints.reviewDispute.resolve(disputeId), { body: { upheld, note: note.trim() } }))),
}
