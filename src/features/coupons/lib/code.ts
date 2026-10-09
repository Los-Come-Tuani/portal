import { COUPON_CODE_PATTERN } from '@/data/schemas/coupon.schema'
import { normalizeCouponCode } from '@/data/schemas/coupon-api.schema'

/** Mientras se escribe: mayúsculas, sin símbolos, en dos grupos de cuatro (`7F3Q-9M2D`). */
export function formatCouponCode(raw: string): string {
  const chars = normalizeCouponCode(raw).slice(0, 8)
  return chars.length > 4 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars
}

/** Ocho letras y números del alfabeto de los cupones (sin `I`, `O`, `0` ni `1`). */
export function isCompleteCode(code: string): boolean {
  return COUPON_CODE_PATTERN.test(normalizeCouponCode(code))
}
