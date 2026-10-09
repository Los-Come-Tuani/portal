import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { Page, QueueFilters, RejectInput, RejectionReason, RequestDetail, RequestSummary } from '../models'
import {
  apiDetailSchema,
  apiQueueSchema,
  apiReasonsSchema,
  toDetail,
  toPage,
  toReasons,
} from '../schemas/verification-api.schema'

/** La cola de verificación del equipo: lo que hace falta para tomar, aprobar o rechazar una solicitud. */
export const verificationRepository = {
  async list({ status = 'open', kind, page, pageSize }: QueueFilters = {}): Promise<Page<RequestSummary>> {
    const data = await http.get<unknown>(endpoints.verificationRequest.list, {
      query: { status, kind, page, page_size: pageSize },
    })
    return toPage(apiQueueSchema.parse(data))
  },

  async get(requestId: string): Promise<RequestDetail> {
    return toDetail(apiDetailSchema.parse(await http.get<unknown>(endpoints.verificationRequest.detail(requestId))))
  },

  async reasons(): Promise<RejectionReason[]> {
    return toReasons(apiReasonsSchema.parse(await http.get<unknown>(endpoints.verificationRequest.reasons)))
  },

  // Cada acción devuelve el expediente como queda.

  /** La toma: queda en revisión y a su nombre. */
  async take(requestId: string): Promise<RequestDetail> {
    return toDetail(apiDetailSchema.parse(await http.post<unknown>(endpoints.verificationRequest.take(requestId))))
  },

  /** La devuelve a la cola. */
  async release(requestId: string): Promise<RequestDetail> {
    return toDetail(apiDetailSchema.parse(await http.post<unknown>(endpoints.verificationRequest.release(requestId))))
  },

  /** Aprueba: la organización se hace visible. Quien se postuló recibe un correo. */
  async approve(requestId: string, note: string): Promise<RequestDetail> {
    const data = await http.post<unknown>(endpoints.verificationRequest.approve(requestId), { body: { note: note.trim() } })
    return toDetail(apiDetailSchema.parse(data))
  },

  /** Rechaza con un motivo; quien se postuló recibe un correo y puede corregir y volver a enviar. */
  async reject(requestId: string, { reason, note }: RejectInput): Promise<RequestDetail> {
    const data = await http.post<unknown>(endpoints.verificationRequest.reject(requestId), { body: { reason, note: note.trim() } })
    return toDetail(apiDetailSchema.parse(data))
  },
}
