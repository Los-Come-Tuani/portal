import { nowMinutes, type ISODate } from '@/lib/dates'
import type { BadgeCampaign } from '../../models'
import { getVisitEvents } from '../generators/visits'

/**
 * El avance de una campaña sale de las visitas confirmadas con QR: cada
 * persona que escanea recibe `multiplier - 1` insignias extra, hasta gastar
 * las compradas.
 */
export function withProgress(campaign: BadgeCampaign, today: ISODate): BadgeCampaign {
  if (campaign.status === 'cancelled') return { ...campaign, extraAwarded: 0 }
  if (today < campaign.startDate) return { ...campaign, extraAwarded: 0, status: 'scheduled' }

  const until = campaign.endDate < today ? campaign.endDate : today
  let people = 0
  for (const event of getVisitEvents(today, nowMinutes())) {
    if (event.type !== 'check_in' || event.stopId !== campaign.stopId) continue
    const date = event.recordedAt.slice(0, 10)
    if (date >= campaign.startDate && date <= until) people += event.groupSize ?? 1
  }
  const extraAwarded = Math.min(campaign.badgeBudget, people * (campaign.multiplier - 1))
  const finished = today > campaign.endDate || extraAwarded >= campaign.badgeBudget
  return { ...campaign, extraAwarded, status: finished ? 'finished' : 'active' }
}
