import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { BadgeCampaignInput } from '../models'
import { badgesRepository } from '../repositories/badges.repository'
import { useMutation } from './mutation'
import { queryKeys } from './query-keys'

export function useBadgeActivations(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.badges.activations(organizationId),
    queryFn: () => badgesRepository.listActivations(organizationId),
    enabled,
  })
}

export function useBadgeCampaigns(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.badges.campaigns(organizationId),
    queryFn: () => badgesRepository.listCampaigns(organizationId),
    enabled,
  })
}

function useInvalidateBadges() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.badges.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
  }
}

export function useActivateBadge() {
  const invalidate = useInvalidateBadges()
  return useMutation({ mutationFn: (stopId: string) => badgesRepository.activate(stopId), onSuccess: invalidate })
}

export function useCancelActivation() {
  const invalidate = useInvalidateBadges()
  return useMutation({
    mutationFn: (activationId: string) => badgesRepository.cancelActivation(activationId),
    onSuccess: invalidate,
  })
}

export function useCreateCampaign() {
  const invalidate = useInvalidateBadges()
  return useMutation({
    mutationFn: (input: BadgeCampaignInput) => badgesRepository.createCampaign(input),
    onSuccess: invalidate,
  })
}

export function useCancelCampaign() {
  const invalidate = useInvalidateBadges()
  return useMutation({
    mutationFn: (campaignId: string) => badgesRepository.cancelCampaign(campaignId),
    onSuccess: invalidate,
  })
}
