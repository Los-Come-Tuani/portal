import type { Coupon, CouponInput } from '@/data/models'

export function couponToInput(coupon: Coupon): CouponInput {
  return {
    title: coupon.title,
    description: coupon.description,
    discountLabel: coupon.discountLabel,
    cost: coupon.cost,
    image: coupon.image,
    organizationId: coupon.organizationId,
    stopId: coupon.stopId,
    status: coupon.status,
    validUntil: coupon.validUntil,
    maxRedemptions: coupon.maxRedemptions,
    terms: coupon.terms,
  }
}
