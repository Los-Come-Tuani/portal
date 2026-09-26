/**
 * Actividad de negocio de prueba, relativa al día en que se siembra la demo:
 * canjes de cupones, activaciones de insignia, campañas y pagos.
 */
import { addDays, addMonths, diffDays, monthKey, toLocalDateTime, weekdayIndex, type ISODate } from '@/lib/dates'
import { createRandom, hashSeed, type Random } from '@/lib/random'
import type {
  BadgeActivation,
  BadgeCampaign,
  BadgeMultiplier,
  Coupon,
  CouponRedemption,
  Organization,
  Pricing,
} from '../../models'
import type { Payment } from '../db'
import { statementId } from '../services/statements'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const FIRST_NAMES = [
  'María', 'José', 'Ana', 'Carlos', 'Sofía', 'Luis', 'Valeria', 'Diego', 'Emily', 'John',
  'Sarah', 'Lukas', 'Camille', 'Marco', 'Hannah', 'Pedro', 'Fernanda', 'Kevin', 'Laura', 'Tomás',
]
const INITIALS = 'ABCDGHJLMPRSTV'

export function redemptionCode(random: Random): string {
  const block = () => Array.from({ length: 4 }, () => CODE_ALPHABET[random.int(0, CODE_ALPHABET.length - 1)]).join('')
  return `KP-${block()}-${block()}`
}

export function generateRedemptions(coupons: Coupon[], seededOn: ISODate, pricing: Pricing): CouponRedemption[] {
  const random = createRandom(hashSeed(`kplan-redemptions:${seededOn}`))
  const redemptions: CouponRedemption[] = []

  for (const coupon of coupons) {
    const isKplan = coupon.organizationId === null
    const from = [coupon.createdAt, addDays(seededOn, -60)].sort().at(-1) as ISODate
    const lastActiveDay =
      coupon.status === 'paused' ? addDays(coupon.createdAt, Math.floor(diffDays(coupon.createdAt, seededOn) / 2)) : seededOn

    for (let date = from; date <= lastActiveDay; date = addDays(date, 1)) {
      const weekend = weekdayIndex(date) >= 5
      const count = random.weighted<number>([
        [0, isKplan ? 70 : 52],
        [1, 30],
        [2, weekend ? 18 : 12],
        [3, weekend ? 6 : 2],
      ])
      for (let index = 0; index < count; index++) {
        const claimedMinutes = random.int(8 * 60, 18 * 60)
        const age = diffDays(date, seededOn)
        const roll = random.next()
        const validatedAfter = random.int(0, Math.min(3, age))
        const status: CouponRedemption['status'] =
          age > 30 ? (roll < 0.85 ? 'validated' : 'expired') : age > 3 ? (roll < 0.8 ? 'validated' : 'pending') : roll < 0.4 ? 'validated' : 'pending'
        const validatedAt =
          status === 'validated'
            ? toLocalDateTime(addDays(date, validatedAfter), Math.min(claimedMinutes + random.int(20, 240), 21 * 60))
            : null
        redemptions.push({
          id: `red-${coupon.id}-${redemptions.length + 1}`,
          couponId: coupon.id,
          organizationId: coupon.organizationId,
          code: redemptionCode(random),
          touristName: `${random.pick(FIRST_NAMES)} ${INITIALS[random.int(0, INITIALS.length - 1)]}.`,
          claimedAt: toLocalDateTime(date, claimedMinutes),
          validatedAt,
          status,
          fee: status === 'validated' && !isKplan ? pricing.couponFee : 0,
        })
      }
    }

    // Siempre queda un código por validar para probar "Validar cupón".
    if (!isKplan && coupon.status === 'active') {
      redemptions.push({
        id: `red-${coupon.id}-${redemptions.length + 1}`,
        couponId: coupon.id,
        organizationId: coupon.organizationId,
        code: redemptionCode(random),
        touristName: `${random.pick(FIRST_NAMES)} ${INITIALS[random.int(0, INITIALS.length - 1)]}.`,
        claimedAt: toLocalDateTime(seededOn, random.int(7 * 60, 9 * 60)),
        validatedAt: null,
        status: 'pending',
        fee: 0,
      })
    }
  }
  return redemptions
}

export function seedActivations(seededOn: ISODate, pricing: Pricing): BadgeActivation[] {
  return [
    {
      id: 'act-tabacalera',
      organizationId: 'org-tabacalera-esteli',
      stopId: 'esteli-tabacalera',
      status: 'active',
      startedAt: addDays(seededOn, -100),
      cancelledAt: null,
      monthlyPrice: pricing.badgeActivationMonthly,
    },
    {
      id: 'act-finca-cata',
      organizationId: 'org-finca-el-mirador',
      stopId: 'cafe-cata',
      status: 'active',
      startedAt: addDays(seededOn, -75),
      cancelledAt: null,
      monthlyPrice: pricing.badgeActivationMonthly,
    },
  ]
}

export function seedCampaigns(seededOn: ISODate, pricing: Pricing): BadgeCampaign[] {
  const pack = (badges: number) => pricing.badgePacks.find((item) => item.badges === badges) ?? pricing.badgePacks[0]
  const campaign = (
    id: string,
    organizationId: string,
    stopId: string,
    multiplier: BadgeMultiplier,
    startOffset: number,
    days: number,
    badges: number,
  ): BadgeCampaign => {
    const chosen = pack(badges)
    const startDate = addDays(seededOn, startOffset)
    return {
      id,
      organizationId,
      stopId,
      multiplier,
      startDate,
      endDate: addDays(startDate, days - 1),
      badgeBudget: chosen.badges,
      extraAwarded: 0,
      price: chosen.price,
      status: 'scheduled',
      createdAt: addDays(startDate, startOffset > 0 ? -startOffset : -2),
    }
  }
  return [
    campaign('camp-tabacalera-agosto', 'org-tabacalera-esteli', 'esteli-tabacalera', 2, -41, 14, 100),
    campaign('camp-tabacalera-actual', 'org-tabacalera-esteli', 'esteli-tabacalera', 3, -6, 17, 250),
    campaign('camp-finca-cata', 'org-finca-el-mirador', 'cafe-cata', 2, 5, 15, 100),
    campaign('camp-leon-techos', 'org-alcaldia-leon', 'leon-techos', 2, -3, 14, 250),
  ]
}

/** Los meses anteriores al pasado quedan pagados; el pasado, por pagar (salvo la finca). */
export function seedPayments(organizations: Organization[], seededOn: ISODate): Payment[] {
  const current = monthKey(seededOn)
  const payments: Payment[] = []
  for (const organization of organizations) {
    for (let period = monthKey(organization.joinedAt); period < addMonths(current, -1); period = addMonths(period, 1)) {
      payments.push({ statementId: statementId(organization.id, period), paidAt: `${addMonths(period, 1)}-06T10:15:00.000` })
    }
    if (organization.id === 'org-finca-el-mirador') {
      const last = addMonths(current, -1)
      payments.push({ statementId: statementId(organization.id, last), paidAt: `${current}-04T16:40:00.000` })
    }
  }
  return payments
}
