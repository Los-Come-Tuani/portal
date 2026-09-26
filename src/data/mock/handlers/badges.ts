import { todayISO } from '@/lib/dates'
import { formatDayMonth } from '@/lib/format'
import { endpoints } from '../../api/endpoints'
import type { BadgeActivation, BadgeCampaign } from '../../models'
import { activationInputSchema, campaignInputSchema } from '../../schemas/badges.schema'
import { fail, parseBody, requireUser, route } from '../http'
import { assertCanManage, findOwnStop, isAdmin, scopeOrganization } from '../services/access'
import { withProgress } from '../services/campaigns'

function ownerOf(organizations: { id: string; stopIds: string[] }[], stopId: string): string {
  const owner = organizations.find((item) => item.stopIds.includes(stopId))
  if (!owner) throw fail.invalid('Ese lugar no pertenece a ninguna organización')
  return owner.id
}

export const badgeRoutes = [
  route('GET', endpoints.badges.activations, (context) => {
    const user = requireUser(context)
    const organizationId = scopeOrganization(user, context.query.get('organizationId'))
    return context.db.badgeActivations.filter((item) => !organizationId || item.organizationId === organizationId)
  }),
  route('POST', endpoints.badges.activations, (context) => {
    const user = requireUser(context)
    const { stopId } = parseBody(activationInputSchema, context.body)
    const stop = findOwnStop(context.db, user, stopId)
    if (stop.hasBadge) throw fail.conflict(`${stop.name} ya da insignia.`)
    const activation: BadgeActivation = {
      id: `act-${Date.now().toString(36)}`,
      organizationId: ownerOf(context.db.organizations, stop.id),
      stopId: stop.id,
      status: 'active',
      startedAt: todayISO(),
      cancelledAt: null,
      monthlyPrice: context.db.pricing.badgeActivationMonthly,
    }
    stop.hasBadge = true
    context.db.badgeActivations.push(activation)
    return activation
  }),
  route('POST', endpoints.badges.cancelActivation(':id'), (context) => {
    const user = requireUser(context)
    const activation = context.db.badgeActivations.find((item) => item.id === context.params.id)
    if (!activation) throw fail.notFound('No encontramos esa activación')
    assertCanManage(user, activation.organizationId)
    const today = todayISO()
    const blocking = context.db.badgeCampaigns
      .map((campaign) => withProgress(campaign, today))
      .find((campaign) => campaign.stopId === activation.stopId && (campaign.status === 'active' || campaign.status === 'scheduled'))
    if (blocking) {
      throw fail.conflict('Este lugar tiene una campaña activa o programada: cancélala o espera a que termine.')
    }
    activation.status = 'cancelled'
    activation.cancelledAt = today
    const stop = context.db.stops.find((item) => item.id === activation.stopId)
    if (stop) stop.hasBadge = false
    return activation
  }),

  route('GET', endpoints.badges.campaigns, (context) => {
    const user = requireUser(context)
    const organizationId = scopeOrganization(user, context.query.get('organizationId'))
    const today = todayISO()
    return context.db.badgeCampaigns
      .filter((item) => !organizationId || item.organizationId === organizationId)
      .map((item) => withProgress(item, today))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }),
  route('POST', endpoints.badges.campaigns, (context) => {
    const user = requireUser(context)
    const input = parseBody(campaignInputSchema, context.body)
    const stop = findOwnStop(context.db, user, input.stopId)
    const today = todayISO()
    if (!stop.hasBadge) throw fail.conflict(`${stop.name} todavía no da insignia: actívala primero.`)
    if (input.startDate < today) throw fail.invalid('Revisa las fechas', { startDate: 'La campaña no puede empezar antes de hoy' })
    const overlapping = context.db.badgeCampaigns.find(
      (item) =>
        item.stopId === stop.id &&
        item.status !== 'cancelled' &&
        item.startDate <= input.endDate &&
        input.startDate <= item.endDate,
    )
    if (overlapping) {
      throw fail.conflict(
        `Ya hay una campaña en ${stop.name} del ${formatDayMonth(overlapping.startDate)} al ${formatDayMonth(overlapping.endDate)}.`,
      )
    }
    const pack = context.db.pricing.badgePacks.find((item) => item.id === input.packId)
    if (!pack) throw fail.invalid('Ese paquete ya no existe', { packId: 'Elige otro paquete' })
    const campaign: BadgeCampaign = {
      id: `camp-${Date.now().toString(36)}`,
      organizationId: ownerOf(context.db.organizations, stop.id),
      stopId: stop.id,
      multiplier: input.multiplier,
      startDate: input.startDate,
      endDate: input.endDate,
      badgeBudget: pack.badges,
      extraAwarded: 0,
      price: pack.price,
      status: 'scheduled',
      createdAt: today,
    }
    context.db.badgeCampaigns.push(campaign)
    return withProgress(campaign, today)
  }),
  route('POST', endpoints.badges.cancelCampaign(':id'), (context) => {
    const user = requireUser(context)
    const campaign = context.db.badgeCampaigns.find((item) => item.id === context.params.id)
    if (!campaign) throw fail.notFound('No encontramos esa campaña')
    assertCanManage(user, campaign.organizationId)
    const today = todayISO()
    if (!isAdmin(user) && withProgress(campaign, today).status !== 'scheduled') {
      throw fail.conflict('Sólo se puede cancelar una campaña que todavía no empieza.')
    }
    campaign.status = 'cancelled'
    return withProgress(campaign, today)
  }),
]
