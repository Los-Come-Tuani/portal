import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { DisputeStatus, ReportStatus, ReportTargetKind, SanctionInput } from '../models'
import {
  apiDisputePageSchema,
  apiDisputeSchema,
  apiReportPageSchema,
  apiReportReasonSchema,
  apiReportSchema,
  apiSanctionPageSchema,
  apiSanctionSchema,
  sanctionBody,
  toDispute,
  toDisputePage,
  toReport,
  toReportPage,
  toSanction,
  toSanctionPage,
} from '../schemas/moderation-api.schema'

interface PageQuery {
  page?: number
  pageSize?: number
}

export interface DisputeFilters extends PageQuery {
  status?: DisputeStatus
}

export interface ReportFilters extends PageQuery {
  status?: ReportStatus
  targetKind?: ReportTargetKind
}

export interface SanctionFilters extends PageQuery {
  userId?: string
  active?: boolean
}

/**
 * La moderación del equipo (docs/servicios.md y docs/avisos.md del repo del API): las reseñas
 * impugnadas, los reportes y las sanciones.
 */
export const moderationRepository = {
  /** De la más vieja a la más nueva. */
  disputes: async ({ status, page = 1, pageSize = 20 }: DisputeFilters = {}) =>
    toDisputePage(apiDisputePageSchema.parse(await http.get<unknown>(endpoints.reviewDispute.list, { query: { status, page, page_size: pageSize } }))),

  /** `upheld`: se le da la razón a quien la impugnó y la reseña se oculta. */
  resolveDispute: async (disputeId: string, upheld: boolean, note: string) =>
    toDispute(apiDisputeSchema.parse(await http.post<unknown>(endpoints.reviewDispute.resolve(disputeId), { body: { upheld, note: note.trim() } }))),

  reportReasons: async () => z.array(apiReportReasonSchema).parse(await http.get<unknown>(endpoints.report.reasons)),

  /** La bandeja, del más viejo al más nuevo. */
  reports: async ({ status, targetKind, page = 1, pageSize = 20 }: ReportFilters = {}) =>
    toReportPage(
      apiReportPageSchema.parse(await http.get<unknown>(endpoints.report.list, { query: { status, target_kind: targetKind, page, page_size: pageSize } })),
    ),

  /** `handled`: se actuó (por ejemplo, con una sanción); `dismissed`: no procede. */
  resolveReport: async (reportId: string, status: 'handled' | 'dismissed', note: string) =>
    toReport(apiReportSchema.parse(await http.post<unknown>(endpoints.report.resolve(reportId), { body: { status, note: note.trim() } }))),

  /** De la más nueva a la más vieja. */
  sanctions: async ({ userId, active, page = 1, pageSize = 20 }: SanctionFilters = {}) =>
    toSanctionPage(
      apiSanctionPageSchema.parse(await http.get<unknown>(endpoints.sanction.list, { query: { user_id: userId, active, page, page_size: pageSize } })),
    ),

  sanction: async (input: SanctionInput) => toSanction(apiSanctionSchema.parse(await http.post<unknown>(endpoints.sanction.list, { body: sanctionBody(input) }))),

  /** Levantar la última sanción vigente devuelve la cuenta a activa. */
  liftSanction: async (sanctionId: string) => toSanction(apiSanctionSchema.parse(await http.post<unknown>(endpoints.sanction.lift(sanctionId)))),
}
