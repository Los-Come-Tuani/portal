import { describe, expect, it } from 'vitest'
import type { BenefitType, CampaignInput } from '../models'
import { apiBenefitTypeSchema, apiCampaignSchema, apiCouponCodePageSchema, campaignBody, campaignPatch, normalizeCouponCode, toBenefitType, toCampaign, toCouponCodePage } from './coupon-api.schema'
import { campaignInputSchema, COUPON_CODE_PATTERN } from './coupon.schema'

const PERCENT: BenefitType = { code: 'descuento_porcentaje', label: 'Descuento en porcentaje', requiresAmount: true, isPercentage: true }
const GIFT: BenefitType = { code: 'regalo', label: 'Regalo', requiresAmount: false, isPercentage: false }

const apiCampaign = {
  id: '0197-almuerzo',
  title: '10% en tu almuerzo',
  description: 'De lunes a viernes.',
  terms: 'Uno por mesa.',
  benefit: { type: { code: 'descuento_porcentaje', label: 'Descuento en porcentaje' }, amount: 10, currency: null, label: '10% de descuento' },
  cost_badges: 3,
  remaining: 47,
  expires_at: '2026-12-31T23:59:59-06:00',
  image: null,
  business: { id: '0195-cafe', name: 'Café La Merced', city: { id: '0193-leon', code: 'leon', name: 'León' }, place_id: null },
  status: 'active',
  stock_total: 50,
  stock_delivered: 3,
  consumed: 1,
  withdrawn_at: null,
  withdrawn_reason: '',
  created_at: '2026-10-01T15:00:00Z',
}

const input: CampaignInput = {
  benefitType: 'descuento_porcentaje',
  title: ' 10% en tu almuerzo ',
  description: '',
  terms: 'Uno por mesa.',
  benefitAmount: 10,
  costBadges: 3,
  stockTotal: 50,
  expiresOn: '2026-12-31',
  image: null,
}

describe('una campaña del API', () => {
  it('pasa al portal con la fecha límite en la hora de Managua', () => {
    const campaign = toCampaign(apiCampaignSchema.parse(apiCampaign))
    expect(campaign).toMatchObject({
      title: '10% en tu almuerzo',
      benefit: { label: '10% de descuento', amount: 10 },
      costBadges: 3,
      expiresAt: '2026-12-31T23:59:00.000',
      business: { name: 'Café La Merced', city: 'León', placeId: null },
      stockDelivered: 3,
      consumed: 1,
      status: 'active',
    })
  })

  it('un tipo de beneficio dice si lleva monto y si es porcentaje', () => {
    expect(toBenefitType(apiBenefitTypeSchema.parse({ id: 'x', code: 'descuento_monto', label: 'Descuento en córdobas', requires_amount: true, is_percentage: false }))).toEqual({
      code: 'descuento_monto',
      label: 'Descuento en córdobas',
      requiresAmount: true,
      isPercentage: false,
    })
  })

  it('los cupones entregados traen el turista y su estado', () => {
    const page = toCouponCodePage(
      apiCouponCodePageSchema.parse({
        next: false,
        previous: false,
        elements: 1,
        pages: 1,
        current: 1,
        results: [
          {
            id: 'c1',
            code: 'K7F3Q9M2',
            title: '10% en tu almuerzo',
            campaign_id: '0197-almuerzo',
            tourist_name: 'Ana',
            status: 'consumed',
            redeemed_at: '2026-10-02T16:00:00Z',
            consumed_at: '2026-10-03T18:30:00Z',
            expires_at: '2026-12-31T23:59:59-06:00',
          },
        ],
      }),
    )
    expect(page.results[0]).toMatchObject({ touristName: 'Ana', status: 'consumed', consumedAt: '2026-10-03T12:30:00.000' })
  })
})

describe('lo que se manda', () => {
  it('al publicar lleva el monto sólo si el tipo lo pide y el fin del último día', () => {
    expect(campaignBody(input, PERCENT)).toEqual({
      benefit_type: 'descuento_porcentaje',
      title: '10% en tu almuerzo',
      description: '',
      terms: 'Uno por mesa.',
      benefit_amount: 10,
      cost_badges: 3,
      stock_total: 50,
      expires_at: '2026-12-31T23:59:59-06:00',
    })
    expect(campaignBody({ ...input, benefitType: 'regalo' }, GIFT)).not.toHaveProperty('benefit_amount')
  })

  it('al corregir no manda el beneficio ni el costo; la foto sólo si cambió', () => {
    const current = toCampaign(apiCampaignSchema.parse({ ...apiCampaign, image: { key: 'coupon-photo/a.jpg', url: null } }))
    const same = campaignPatch({ ...input, image: { key: 'coupon-photo/a.jpg', url: null } }, current)
    expect(same).not.toHaveProperty('benefit_type')
    expect(same).not.toHaveProperty('cost_badges')
    expect(same).not.toHaveProperty('image_key')
    expect(campaignPatch({ ...input, image: null }, current)).toMatchObject({ image_key: null })
    expect(campaignPatch({ ...input, image: { key: 'coupon-photo/b.jpg', url: null } }, current)).toMatchObject({ image_key: 'coupon-photo/b.jpg' })
  })
})

describe('las reglas del formulario', () => {
  const schema = campaignInputSchema({ benefitTypes: [PERCENT, GIFT], today: '2026-10-08', delivered: 5 })

  it('un porcentaje no pasa de 100 y un tipo con monto lo exige', () => {
    expect(schema.safeParse({ ...input, benefitAmount: 120 }).error?.issues[0].path).toEqual(['benefitAmount'])
    expect(schema.safeParse({ ...input, benefitAmount: null }).error?.issues[0].path).toEqual(['benefitAmount'])
    expect(schema.safeParse({ ...input, benefitType: 'regalo', benefitAmount: null }).success).toBe(true)
  })

  it('no reparte menos cupones de los entregados ni vence en el pasado', () => {
    expect(schema.safeParse({ ...input, stockTotal: 4 }).error?.issues[0].path).toEqual(['stockTotal'])
    expect(schema.safeParse({ ...input, expiresOn: '2026-10-07' }).error?.issues[0].path).toEqual(['expiresOn'])
  })
})

describe('el código del mostrador', () => {
  it('se acepta como lo dicta el turista y sin las letras que se confunden', () => {
    expect(normalizeCouponCode('k7f3-q9m2 ')).toBe('K7F3Q9M2')
    expect(COUPON_CODE_PATTERN.test('K7F3Q9M2')).toBe(true)
    expect(COUPON_CODE_PATTERN.test('K7F3Q9M0')).toBe(false)
  })
})
