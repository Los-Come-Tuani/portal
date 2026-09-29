import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OrganizationInput } from '../models'
import { organizationsRepository, type OrganizationFilters } from '../repositories/organizations.repository'
import { queryKeys } from './query-keys'

export function useOrganizations(filters: OrganizationFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.organizations.list(filters),
    queryFn: () => organizationsRepository.list(filters),
    enabled,
  })
}

export function useOrganization(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(organizationId ?? ''),
    queryFn: () => organizationsRepository.get(organizationId ?? ''),
    enabled: !!organizationId,
  })
}

function useInvalidateOrganizations() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
  }
}

export function useSaveOrganization() {
  const onSuccess = useInvalidateOrganizations()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrganizationInput }) => organizationsRepository.update(id, input),
    onSuccess,
  })
}

export function useAssignStops() {
  const onSuccess = useInvalidateOrganizations()
  return useMutation({
    mutationFn: ({ id, stopIds }: { id: string; stopIds: string[] }) => organizationsRepository.assignStops(id, stopIds),
    onSuccess,
  })
}

export function useRemoveStop() {
  const onSuccess = useInvalidateOrganizations()
  return useMutation({
    mutationFn: ({ id, stopId }: { id: string; stopId: string }) => organizationsRepository.removeStop(id, stopId),
    onSuccess,
  })
}
