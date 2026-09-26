import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { BadgeActivation, BadgeCampaign, BadgeCampaignInput } from '../models'

export const badgesRepository = {
  listActivations: (organizationId?: string) =>
    http.get<BadgeActivation[]>(endpoints.badges.activations, { query: { organizationId } }),
  activate: (stopId: string) => http.post<BadgeActivation>(endpoints.badges.activations, { body: { stopId } }),
  cancelActivation: (activationId: string) =>
    http.post<BadgeActivation>(endpoints.badges.cancelActivation(activationId)),

  listCampaigns: (organizationId?: string) =>
    http.get<BadgeCampaign[]>(endpoints.badges.campaigns, { query: { organizationId } }),
  createCampaign: (input: BadgeCampaignInput) => http.post<BadgeCampaign>(endpoints.badges.campaigns, { body: input }),
  cancelCampaign: (campaignId: string) => http.post<BadgeCampaign>(endpoints.badges.cancelCampaign(campaignId)),
}
