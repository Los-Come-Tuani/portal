import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { Coupon, CouponInput, CouponRedemption, RedemptionStatus } from '../models'

export interface RedemptionFilters {
  /** Id de la organización, o `"kplan"` para los cupones de K'Plan. */
  organizationId?: string
  couponId?: string
  status?: RedemptionStatus
  from?: string
}

export interface RedemptionLookup {
  redemption: CouponRedemption
  coupon: Coupon
}

export const couponsRepository = {
  list: (organizationId?: string) => http.get<Coupon[]>(endpoints.coupons.list, { query: { organizationId } }),
  create: (input: CouponInput) => http.post<Coupon>(endpoints.coupons.list, { body: input }),
  update: (couponId: string, input: CouponInput) => http.put<Coupon>(endpoints.coupons.detail(couponId), { body: input }),
  remove: (couponId: string) => http.delete(endpoints.coupons.detail(couponId)),

  listRedemptions: (filters: RedemptionFilters = {}) =>
    http.get<CouponRedemption[]>(endpoints.redemptions.list, { query: { ...filters } }),
  lookup: (code: string) => http.get<RedemptionLookup>(endpoints.redemptions.byCode(code)),
  validate: (code: string) => http.post<RedemptionLookup>(endpoints.redemptions.validate(code)),
}
