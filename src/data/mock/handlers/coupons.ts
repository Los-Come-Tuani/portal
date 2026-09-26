import { diffDays, nowLocalDateTime, todayISO } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import { uniqueSlug } from '@/lib/slug'
import { endpoints } from '../../api/endpoints'
import type { Coupon, CouponRedemption } from '../../models'
import { couponInputSchema, redemptionCodeSchema } from '../../schemas/coupon.schema'
import type { MockDatabase } from '../db'
import type { MockContext } from '../http'
import { fail, parseBody, requireUser, route } from '../http'
import { assertCanManage, findOwnStop, isAdmin, scopeOrganization } from '../services/access'

/** Un código sin validar vence a los 30 días. */
const REDEMPTION_DAYS = 30

function expireOld(db: MockDatabase) {
  const today = todayISO()
  for (const redemption of db.redemptions) {
    if (redemption.status === 'pending' && diffDays(redemption.claimedAt.slice(0, 10), today) > REDEMPTION_DAYS) {
      redemption.status = 'expired'
    }
  }
}

function findCoupon(context: MockContext): Coupon {
  const coupon = context.db.coupons.find((item) => item.id === context.params.id)
  if (!coupon) throw fail.notFound('No encontramos ese cupón')
  return coupon
}

function fromInput(context: MockContext): Omit<Coupon, 'id' | 'createdAt'> {
  const user = requireUser(context)
  const input = parseBody(couponInputSchema, context.body)
  if (!isAdmin(user) && user.role !== 'negocio') throw fail.forbidden()
  if (input.stopId) findOwnStop(context.db, user, input.stopId)
  return { ...input, organizationId: isAdmin(user) ? input.organizationId : user.organizationId }
}

function findRedemption(context: MockContext): { redemption: CouponRedemption; coupon: Coupon } {
  const user = requireUser(context)
  const code = parseBody(redemptionCodeSchema, context.params.code)
  expireOld(context.db)
  const redemption = context.db.redemptions.find((item) => item.code === code)
  if (!redemption || (!isAdmin(user) && redemption.organizationId !== user.organizationId)) {
    throw fail.notFound('No encontramos ese código. Revisa que esté bien escrito y que sea de tu negocio.')
  }
  const coupon = context.db.coupons.find((item) => item.id === redemption.couponId)
  if (!coupon) throw fail.notFound('Ese cupón ya no existe')
  return { redemption, coupon }
}

export const couponRoutes = [
  route('GET', endpoints.coupons.list, (context) => {
    const user = requireUser(context)
    const requested = context.query.get('organizationId')
    const onlyKplan = requested === 'kplan'
    const organizationId = onlyKplan ? null : scopeOrganization(user, requested)
    return context.db.coupons
      .filter((coupon) => (onlyKplan ? coupon.organizationId === null : !organizationId || coupon.organizationId === organizationId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }),
  route('POST', endpoints.coupons.list, (context) => {
    const data = fromInput(context)
    const coupon: Coupon = {
      ...data,
      id: uniqueSlug(`cupon-${data.title}`, (id) => context.db.coupons.some((item) => item.id === id)),
      createdAt: todayISO(),
    }
    context.db.coupons.push(coupon)
    return coupon
  }),
  route('PUT', endpoints.coupons.detail(':id'), (context) => {
    const user = requireUser(context)
    const coupon = findCoupon(context)
    assertCanManage(user, coupon.organizationId)
    Object.assign(coupon, fromInput(context))
    return coupon
  }),
  route('DELETE', endpoints.coupons.detail(':id'), (context) => {
    const user = requireUser(context)
    const coupon = findCoupon(context)
    assertCanManage(user, coupon.organizationId)
    if (context.db.redemptions.some((item) => item.couponId === coupon.id)) {
      throw fail.conflict('Este cupón ya tiene canjes: páusalo en lugar de borrarlo.')
    }
    context.db.coupons = context.db.coupons.filter((item) => item.id !== coupon.id)
    return undefined
  }),

  route('GET', endpoints.redemptions.list, (context) => {
    const user = requireUser(context)
    expireOld(context.db)
    const requested = context.query.get('organizationId')
    const onlyKplan = requested === 'kplan'
    const organizationId = onlyKplan ? null : scopeOrganization(user, requested)
    const couponId = context.query.get('couponId')
    const status = context.query.get('status')
    const from = context.query.get('from')
    return context.db.redemptions
      .filter((item) => (onlyKplan ? item.organizationId === null : !organizationId || item.organizationId === organizationId))
      .filter((item) => !couponId || item.couponId === couponId)
      .filter((item) => !status || item.status === status)
      .filter((item) => !from || item.claimedAt.slice(0, 10) >= from)
      .sort((a, b) => (b.validatedAt ?? b.claimedAt).localeCompare(a.validatedAt ?? a.claimedAt))
  }),
  route('GET', endpoints.redemptions.byCode(':code'), (context) => findRedemption(context)),
  route('POST', endpoints.redemptions.validate(':code'), (context) => {
    const { redemption, coupon } = findRedemption(context)
    if (redemption.status === 'validated' && redemption.validatedAt) {
      throw fail.conflict(`Este cupón ya se validó el ${formatDateTime(redemption.validatedAt)}.`)
    }
    if (redemption.status === 'expired') throw fail.gone('Este cupón venció sin usarse.')
    redemption.status = 'validated'
    redemption.validatedAt = nowLocalDateTime()
    redemption.fee = coupon.organizationId ? context.db.pricing.couponFee : 0
    return { redemption, coupon }
  }),
]
