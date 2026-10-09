import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type {
  CredentialReviewInput,
  Page,
  ProviderQueueFilters,
  ProviderReasons,
  ProviderRequestDetail,
  ProviderRequestSummary,
  RejectInput,
} from '../models'
import {
  apiProviderDetailSchema,
  apiProviderQueueSchema,
  apiProviderReasonsSchema,
  toProviderDetail,
  toProviderPage,
  toProviderReasons,
} from '../schemas/provider-api.schema'

const detail = async (request: Promise<unknown>): Promise<ProviderRequestDetail> =>
  toProviderDetail(apiProviderDetailSchema.parse(await request))

/** La cola de guías y traductores. Cada acción devuelve el expediente como queda. */
export const providersRepository = {
  async list({ status = 'open', service, procedure, page, pageSize }: ProviderQueueFilters = {}): Promise<Page<ProviderRequestSummary>> {
    const data = await http.get<unknown>(endpoints.providerRequest.list, {
      query: { status, service, procedure, page, page_size: pageSize },
    })
    return toProviderPage(apiProviderQueueSchema.parse(data))
  },

  get: (requestId: string) => detail(http.get<unknown>(endpoints.providerRequest.detail(requestId))),

  async reasons(): Promise<ProviderReasons> {
    return toProviderReasons(apiProviderReasonsSchema.parse(await http.get<unknown>(endpoints.providerRequest.reasons)))
  },

  /** La toma: queda en revisión y a su nombre. */
  take: (requestId: string) => detail(http.post<unknown>(endpoints.providerRequest.take(requestId))),

  release: (requestId: string) => detail(http.post<unknown>(endpoints.providerRequest.release(requestId))),

  /** Acepta o rechaza un documento; si nadie la tenía, la toma. */
  reviewDocument: (requestId: string, { documentId, accepted, reason, note }: CredentialReviewInput) =>
    detail(
      http.post<unknown>(endpoints.providerRequest.documentReview(requestId), {
        body: accepted ? { document_id: documentId, accepted } : { document_id: documentId, accepted, reason, note: note.trim() },
      }),
    ),

  /** Cierra el expediente para que el prestador corrija lo rechazado. */
  requestChanges: (requestId: string, note: string) =>
    detail(http.post<unknown>(endpoints.providerRequest.requestChanges(requestId), { body: { note: note.trim() } })),

  approve: (requestId: string, note: string) =>
    detail(http.post<unknown>(endpoints.providerRequest.approve(requestId), { body: { note: note.trim() } })),

  reject: (requestId: string, { reason, note }: RejectInput) =>
    detail(http.post<unknown>(endpoints.providerRequest.reject(requestId), { body: { reason, note: note.trim() } })),
}
