import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { renameFieldErrors } from '../api/errors'
import { http } from '../api/http-client'
import type { BenefitType, CampaignInput, CouponCampaign, CouponCampaignStatus, CouponCode, CouponCodeStatus, Page } from '../models'
import {
  apiBenefitTypeSchema,
  apiCampaignPageSchema,
  apiCampaignSchema,
  apiCouponCodePageSchema,
  apiCouponCodeSchema,
  CAMPAIGN_FORM_FIELDS,
  campaignBody,
  campaignPatch,
  normalizeCouponCode,
  toBenefitType,
  toCampaign,
  toCampaignPage,
  toCouponCode,
  toCouponCodePage,
} from '../schemas/coupon-api.schema'
import { allPages } from './pages'

export interface CampaignFilters {
  status?: CouponCampaignStatus
  businessId?: string
}

export interface RedemptionFilters {
  status?: CouponCodeStatus
  campaignId?: string
  /** El código exacto (normalizado), en cualquier estado. */
  code?: string
  page?: number
  pageSize?: number
}

async function campaign(request: Promise<unknown>): Promise<CouponCampaign> {
  try {
    return toCampaign(apiCampaignSchema.parse(await request))
  } catch (error) {
    throw renameFieldErrors(error, CAMPAIGN_FORM_FIELDS)
  }
}

const redemptionPage = async ({ status, campaignId, code, page = 1, pageSize = 20 }: RedemptionFilters): Promise<Page<CouponCode>> =>
  toCouponCodePage(
    apiCouponCodePageSchema.parse(
      await http.get<unknown>(endpoints.couponRedemption.list, { query: { status, campaign_id: campaignId, code, page, page_size: pageSize } }),
    ),
  )

/**
 * Las campañas de cupones del comercio y los cupones que entregó (docs/agenda-y-recompensas.md del
 * repo del API). El comercio ve lo suyo; el equipo con `content.moderate`, todo.
 */
export const couponsRepository = {
  /** Todas las que dejan ver los filtros: un comercio tiene pocas. */
  list: (filters: CampaignFilters = {}) =>
    allPages(async (page, pageSize) =>
      toCampaignPage(
        apiCampaignPageSchema.parse(
          await http.get<unknown>(endpoints.couponCampaign.list, { query: { status: filters.status, business_id: filters.businessId, page, page_size: pageSize } }),
        ),
      ),
    ),

  benefitTypes: async (): Promise<BenefitType[]> => z.array(apiBenefitTypeSchema).parse(await http.get<unknown>(endpoints.catalog.benefitTypes)).map(toBenefitType),

  create: (input: CampaignInput, benefitType: BenefitType | undefined) =>
    campaign(http.post<unknown>(endpoints.couponCampaign.list, { body: campaignBody(input, benefitType) })),

  update: (current: CouponCampaign, input: CampaignInput) =>
    campaign(http.patch<unknown>(endpoints.couponCampaign.detail(current.id), { body: campaignPatch(input, current) })),

  /** Corta la emisión; los cupones ya entregados siguen valiendo hasta su fecha. */
  withdraw: (campaignId: string, reason: string) => campaign(http.post<unknown>(endpoints.couponCampaign.withdraw(campaignId), { body: { reason: reason.trim() } })),

  redemptions: redemptionPage,

  /**
   * Busca un código entre los cupones del comercio, sin consumirlo: el API sólo consume en
   * `validate/`. Devuelve el cupón en el estado que tenga, o `null` si no es de este comercio.
   */
  find: async (code: string): Promise<CouponCode | null> => {
    const wanted = normalizeCouponCode(code)
    if (!wanted) return null
    const { results } = await redemptionPage({ code: wanted, pageSize: 1 })
    return results[0] ?? null
  },

  /** Lo consume en el mostrador: `404` si es de otro comercio, `409` si ya se usó o venció. */
  validate: async (code: string) =>
    toCouponCode(apiCouponCodeSchema.parse(await http.post<unknown>(endpoints.couponRedemption.validate, { body: { code: normalizeCouponCode(code) } }))),
}
