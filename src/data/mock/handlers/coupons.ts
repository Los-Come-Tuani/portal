import { z } from 'zod'
import { nowLocalDateTime } from '@/lib/dates'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import { fail, paginate, parseBody, requireUser, route } from '../http'
import { hasPermission } from '../services/access'
import { checkPhotos } from '../services/places'
import {
  actorBusiness,
  BENEFIT_TYPES,
  benefitTypeOf,
  campaignStatus,
  codeStatus,
  delivered,
  MAX_ACTIVE,
  visibleCampaign,
  visibleCampaigns,
  wireCampaign,
  wireCouponCode,
  type MockCampaign,
} from '../services/rewards'

/** `2026-12-31T23:59:59-06:00` → la hora local de la demo. */
const localOf = (instant: string) => nowLocalDateTime(new Date(instant))

const campaignBody = z.object({
  benefit_type: z.string().min(1).max(40),
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(1000).default(''),
  terms: z.string().trim().max(1000).default(''),
  benefit_amount: z.number().positive().max(1_000_000).nullish(),
  cost_badges: z.number().int().min(1).max(1000),
  stock_total: z.number().int().min(1).max(100_000),
  expires_at: z.string().min(10),
  image_key: z.string().nullish(),
})

const campaignPatch = z.object({
  title: z.string().trim().min(3).max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  terms: z.string().trim().max(1000).optional(),
  stock_total: z.number().int().min(1).max(100_000).optional(),
  expires_at: z.string().min(10).nullish(),
  image_key: z.string().nullish(),
})

const invalid = (field: string, message: string) => fail.invalid('Revisa los campos marcados', { [field]: message })
const normalize = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

export const couponRoutes = [
  route('GET', endpoints.catalog.benefitTypes, () => BENEFIT_TYPES.map((item) => ({ id: item.code, ...item })), { isPublic: true }),

  route('GET', endpoints.couponCampaign.list, (context) => {
    const { db, query } = context
    const status = query.get('status')
    const businessId = query.get('business_id')
    const shown = visibleCampaigns(db, requireUser(context))
      .filter((campaign) => !status || campaignStatus(db, campaign) === status)
      .filter((campaign) => !businessId || campaign.businessId === businessId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((campaign) => wireCampaign(db, campaign))
    return paginate(shown, query)
  }),

  route('POST', endpoints.couponCampaign.list, (context) => {
    const { db } = context
    const business = actorBusiness(db, requireUser(context))
    if (!business) throw fail.forbidden()
    const input = parseBody(campaignBody, context.body)
    const type = benefitTypeOf(input.benefit_type)
    if (!type) throw invalid('benefit_type', 'Ese tipo de beneficio no existe.')
    if (type.requires_amount && !input.benefit_amount) throw invalid('benefit_amount', 'Este beneficio necesita un monto.')
    if (type.is_percentage && (input.benefit_amount ?? 0) > 100) throw invalid('benefit_amount', 'Un porcentaje no pasa de 100.')
    const expiresAt = localOf(input.expires_at)
    if (expiresAt <= nowLocalDateTime()) throw invalid('expires_at', 'La fecha límite tiene que ser futura.')
    const active = db.campaigns.filter((item) => item.businessId === business.id && campaignStatus(db, item) === 'active').length
    if (active >= MAX_ACTIVE) throw fail.conflict(`Ya tienes ${MAX_ACTIVE} campañas activas: retira una antes de publicar otra.`)
    const [image = null] = input.image_key ? checkPhotos(db, [input.image_key], [], 'image_key') : []
    const campaign: MockCampaign = {
      id: uniqueSlug(`campana-${input.title}`, (id) => db.campaigns.some((item) => item.id === id)),
      businessId: business.id,
      title: input.title,
      description: input.description,
      terms: input.terms,
      benefitType: type.code,
      benefitAmount: type.requires_amount ? (input.benefit_amount ?? null) : null,
      costBadges: input.cost_badges,
      stockTotal: input.stock_total,
      image,
      expiresAt,
      withdrawnAt: null,
      withdrawnReason: '',
      createdAt: nowLocalDateTime(),
    }
    db.campaigns.push(campaign)
    return wireCampaign(db, campaign)
  }),

  route('GET', endpoints.couponCampaign.detail(':id'), (context) => wireCampaign(context.db, visibleCampaign(context.db, requireUser(context), context.params.id))),

  route('PATCH', endpoints.couponCampaign.detail(':id'), (context) => {
    const { db } = context
    const user = requireUser(context)
    const campaign = visibleCampaign(db, user, context.params.id)
    if (!actorBusiness(db, user)) throw fail.forbidden()
    if (campaignStatus(db, campaign) !== 'active') throw fail.conflict('Solo se edita una campaña activa.')
    const input = parseBody(campaignPatch, context.body)
    if (input.stock_total !== undefined && input.stock_total < delivered(db, campaign)) {
      throw invalid('stock_total', `Ya se entregaron ${delivered(db, campaign)} cupones.`)
    }
    if (input.expires_at !== undefined && (!input.expires_at || localOf(input.expires_at) <= nowLocalDateTime())) {
      throw invalid('expires_at', 'La fecha límite tiene que ser futura.')
    }
    if (input.image_key !== undefined) {
      campaign.image = input.image_key ? (checkPhotos(db, [input.image_key], campaign.image ? [campaign.image] : [], 'image_key')[0] ?? null) : null
    }
    if (input.title !== undefined) campaign.title = input.title
    if (input.description !== undefined) campaign.description = input.description
    if (input.terms !== undefined) campaign.terms = input.terms
    if (input.stock_total !== undefined) campaign.stockTotal = input.stock_total
    if (input.expires_at) campaign.expiresAt = localOf(input.expires_at)
    return wireCampaign(db, campaign)
  }),

  route('POST', endpoints.couponCampaign.withdraw(':id'), (context) => {
    const { db } = context
    const user = requireUser(context)
    const campaign = visibleCampaign(db, user, context.params.id)
    const status = campaignStatus(db, campaign)
    if (status === 'withdrawn' || status === 'expired') throw fail.conflict('Esa campaña ya no está activa.')
    const { reason } = parseBody(z.object({ reason: z.string().max(500).default('') }), context.body ?? {})
    campaign.withdrawnAt = nowLocalDateTime()
    campaign.withdrawnReason = reason.trim()
    return wireCampaign(db, campaign)
  }),

  route('GET', endpoints.couponRedemption.list, (context) => {
    const { db, query } = context
    const user = requireUser(context)
    const campaigns = new Set(visibleCampaigns(db, user).map((item) => item.id))
    const status = query.get('status')
    const campaignId = query.get('campaign_id')
    const shown = db.couponCodes
      .filter((coupon) => campaigns.has(coupon.campaignId))
      .filter((coupon) => !status || codeStatus(coupon) === status)
      .filter((coupon) => !campaignId || coupon.campaignId === campaignId)
      .sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt))
      .map((coupon) => wireCouponCode(db, coupon))
    return paginate(shown, query)
  }),

  route('POST', endpoints.couponRedemption.validate, (context) => {
    const { db } = context
    const user = requireUser(context)
    const business = actorBusiness(db, user)
    if (!business && !hasPermission(db, user, ['content.moderate'])) throw fail.forbidden()
    const { code } = parseBody(z.object({ code: z.string().min(8).max(20) }), context.body)
    const coupon = db.couponCodes.find((item) => normalize(item.code) === normalize(code))
    const campaign = coupon && db.campaigns.find((item) => item.id === coupon.campaignId)
    if (!coupon || !campaign || !business || campaign.businessId !== business.id) throw fail.notFound('No encontramos ese cupón en tu comercio.')
    const status = codeStatus(coupon)
    if (status === 'consumed') throw fail.conflict('Ese cupón ya se usó.')
    if (status === 'expired') throw fail.conflict('Ese cupón venció.')
    coupon.consumedAt = nowLocalDateTime()
    return wireCouponCode(db, coupon)
  }),
]
