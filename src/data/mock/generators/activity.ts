/**
 * Actividad de prueba de la demo anterior, relativa al día en que se siembra: activaciones y campañas
 * de insignias. La agenda las muestra; el API no las tiene (la insignia es `has_badge` del lugar).
 */
import { addDays, type ISODate } from '@/lib/dates'
import type { BadgeActivation, BadgeCampaign, BadgeMultiplier, Pricing } from '../../models'

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
