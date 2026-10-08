import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/data/models'
import { getDatabase, resetDatabase } from '../db'
import { handleMockRequest } from '../server'
import { hasPermission } from '../services/access'
import { demoSession } from '../services/demo-session'
import { actorOrganization } from '../services/places'
import { campaignStatus, codeStatus } from '../services/rewards'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
})

const request = (method: 'GET' | 'POST', path: string, query: Record<string, string> = {}, body?: unknown) =>
  handleMockRequest({ method, path, query: new URLSearchParams(query), body })

type Page = { elements: number; results: Record<string, unknown>[] }

function userOf(type: string): User {
  const db = getDatabase()
  const user = db.users.find((item) => actorOrganization(db, item)?.type === type)
  if (!user) throw new Error(`La demo no tiene una cuenta de ${type}`)
  return user
}

function staff(): User {
  const db = getDatabase()
  const user = db.users.find((item) => hasPermission(db, item, ['content.moderate', 'billing.view']))
  if (!user) throw new Error('La demo no tiene una cuenta del equipo')
  return user
}

/** El backend de demo responde lo mismo que el API en lo que el portal pidió en 738fa9b. */
describe('backend de demo', () => {
  beforeEach(() => {
    storage.clear()
    resetDatabase()
  })

  it('busca un cupón del comercio por su código, en cualquier estado y sin consumirlo', async () => {
    const owner = userOf('negocio')
    const db = getDatabase()
    const business = actorOrganization(db, owner)
    const mine = new Set(db.campaigns.filter((item) => item.businessId === business?.id).map((item) => item.id))
    const coupon = db.couponCodes.find((item) => mine.has(item.campaignId))
    const foreign = db.couponCodes.find((item) => !mine.has(item.campaignId))
    expect(coupon).toBeDefined()
    if (!coupon) return
    const before = codeStatus(coupon)
    demoSession.open(owner.id)

    const typed = `${coupon.code.slice(0, 4).toLowerCase()} - ${coupon.code.slice(4)}`
    const found = await request('GET', '/coupon-redemption/', { code: typed, page_size: '1' })
    expect(found.status).toBe(200)
    expect((found.data as Page).results.map((item) => item.code)).toEqual([coupon.code])
    expect(codeStatus(coupon)).toBe(before)

    if (foreign) {
      const other = await request('GET', '/coupon-redemption/', { code: foreign.code })
      expect((other.data as Page).elements).toBe(0)
    }
  })

  it('no deja retirar una campaña agotada', async () => {
    const owner = userOf('negocio')
    const db = getDatabase()
    const business = actorOrganization(db, owner)
    const campaign = db.campaigns.find((item) => item.businessId === business?.id && campaignStatus(db, item) === 'active')
    expect(campaign).toBeDefined()
    if (!campaign) return
    campaign.stockTotal = db.couponCodes.filter((item) => item.campaignId === campaign.id).length
    expect(campaignStatus(db, campaign)).toBe('sold_out')
    demoSession.open(owner.id)

    const response = await request('POST', `/coupon-campaign/${campaign.id}/withdraw/`, {}, { reason: '' })
    expect(response.status).toBe(409)
  })

  it('el comercio lee las tarifas; una alcaldía no', async () => {
    demoSession.open(userOf('negocio').id)
    expect((await request('GET', '/pricing/')).status).toBe(200)

    demoSession.open(userOf('alcaldia').id)
    expect((await request('GET', '/pricing/')).status).toBe(403)
  })

  it('filtra la agenda por organizador', async () => {
    const db = getDatabase()
    const organizerId = db.agenda.find((item) => item.organizerId)?.organizerId
    expect(organizerId).toBeTruthy()
    if (!organizerId) return
    demoSession.open(staff().id)

    const response = await request('GET', '/cultural-event/', { organizer_id: organizerId, page_size: '100' })
    const { results } = response.data as Page
    expect(results.length).toBe(db.agenda.filter((item) => item.organizerId === organizerId).length)
    expect(results.every((item) => (item.organizer as { id: string }).id === organizerId)).toBe(true)
  })
})
