/**
 * Las campañas de cupones y los cupones entregados en el backend de demo, con el formato y las reglas
 * del API (docs/agenda-y-recompensas.md del repo del API).
 */
import { nowLocalDateTime, type LocalDateTime } from '@/lib/dates'
import type { CouponCampaignStatus, CouponCodeStatus, Organization, User } from '../../models'
import type { MockDatabase } from '../db'
import { fail } from '../http'
import { hasPermission } from './access'
import { actorOrganization, wireCity, wireInstant, wirePhoto } from './places'

export interface MockCampaign {
  id: string
  /** El comercio (`organizations[].id`). */
  businessId: string
  title: string
  description: string
  terms: string
  benefitType: string
  benefitAmount: number | null
  costBadges: number
  stockTotal: number
  image: string | null
  expiresAt: LocalDateTime
  withdrawnAt: LocalDateTime | null
  withdrawnReason: string
  createdAt: LocalDateTime
}

export interface MockCouponCode {
  id: string
  code: string
  campaignId: string
  touristName: string
  redeemedAt: LocalDateTime
  consumedAt: LocalDateTime | null
  expiresAt: LocalDateTime
}

export const BENEFIT_TYPES = [
  { code: 'descuento_porcentaje', label: 'Descuento en porcentaje', requires_amount: true, is_percentage: true },
  { code: 'descuento_monto', label: 'Descuento en córdobas', requires_amount: true, is_percentage: false },
  { code: 'producto_gratis', label: 'Producto gratis', requires_amount: false, is_percentage: false },
  { code: 'regalo', label: 'Regalo', requires_amount: false, is_percentage: false },
] as const

export const MAX_ACTIVE = 3

/** Sin `I`, `O`, `0` ni `1`, como los códigos del API. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const NOT_FOUND = 'No encontramos esa campaña.'

export const benefitTypeOf = (code: string) => BENEFIT_TYPES.find((item) => item.code === code)

/** Como `benefit_label` del API: "10% de descuento", "C$ 50 de descuento", "Producto gratis". */
export function benefitLabel(code: string, amount: number | null): string {
  const type = benefitTypeOf(code)
  if (amount === null || !type) return type?.label ?? code
  return type.is_percentage ? `${amount}% de descuento` : `C$ ${amount} de descuento`
}

export const delivered = (db: MockDatabase, campaign: MockCampaign) => db.couponCodes.filter((item) => item.campaignId === campaign.id).length

export function campaignStatus(db: MockDatabase, campaign: MockCampaign, now: LocalDateTime = nowLocalDateTime()): CouponCampaignStatus {
  if (campaign.withdrawnAt) return 'withdrawn'
  if (campaign.expiresAt <= now) return 'expired'
  if (delivered(db, campaign) >= campaign.stockTotal) return 'sold_out'
  return 'active'
}

export function codeStatus(coupon: MockCouponCode, now: LocalDateTime = nowLocalDateTime()): CouponCodeStatus {
  if (coupon.consumedAt) return 'consumed'
  if (coupon.expiresAt <= now) return 'expired'
  return 'valid'
}

/** El comercio verificado de quien entró. */
export function actorBusiness(db: MockDatabase, user: User): Organization | null {
  const organization = actorOrganization(db, user)
  return organization?.type === 'negocio' ? organization : null
}

/** El comercio ve las suyas; el equipo con `content.moderate`, todas. */
export function visibleCampaigns(db: MockDatabase, user: User): MockCampaign[] {
  if (hasPermission(db, user, ['content.moderate'])) return db.campaigns
  const business = actorBusiness(db, user)
  if (!business) throw fail.forbidden()
  return db.campaigns.filter((campaign) => campaign.businessId === business.id)
}

export function visibleCampaign(db: MockDatabase, user: User, campaignId: string): MockCampaign {
  const campaign = visibleCampaigns(db, user).find((item) => item.id === campaignId)
  if (!campaign) throw fail.notFound(NOT_FOUND)
  return campaign
}

export function wireCampaign(db: MockDatabase, campaign: MockCampaign) {
  const business = db.organizations.find((item) => item.id === campaign.businessId)
  const given = delivered(db, campaign)
  const type = benefitTypeOf(campaign.benefitType)
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    terms: campaign.terms,
    benefit: {
      type: { code: campaign.benefitType, label: type?.label ?? campaign.benefitType },
      amount: campaign.benefitAmount,
      currency: campaign.benefitAmount !== null && type && !type.is_percentage ? 'NIO' : null,
      label: benefitLabel(campaign.benefitType, campaign.benefitAmount),
    },
    cost_badges: campaign.costBadges,
    remaining: Math.max(0, campaign.stockTotal - given),
    expires_at: wireInstant(campaign.expiresAt),
    image: campaign.image ? wirePhoto(db, campaign.image) : null,
    business: {
      id: campaign.businessId,
      name: business?.name ?? '',
      city: wireCity(business?.city ?? ''),
      place_id: business?.stopIds[0] ?? null,
    },
    status: campaignStatus(db, campaign),
    stock_total: campaign.stockTotal,
    stock_delivered: given,
    consumed: db.couponCodes.filter((item) => item.campaignId === campaign.id && item.consumedAt).length,
    withdrawn_at: campaign.withdrawnAt ? wireInstant(campaign.withdrawnAt) : null,
    withdrawn_reason: campaign.withdrawnReason,
    created_at: wireInstant(campaign.createdAt),
  }
}

export function wireCouponCode(db: MockDatabase, coupon: MockCouponCode) {
  return {
    id: coupon.id,
    code: coupon.code,
    title: db.campaigns.find((item) => item.id === coupon.campaignId)?.title ?? '',
    campaign_id: coupon.campaignId,
    tourist_name: coupon.touristName,
    status: codeStatus(coupon),
    redeemed_at: wireInstant(coupon.redeemedAt),
    consumed_at: coupon.consumedAt ? wireInstant(coupon.consumedAt) : null,
    expires_at: wireInstant(coupon.expiresAt),
  }
}
