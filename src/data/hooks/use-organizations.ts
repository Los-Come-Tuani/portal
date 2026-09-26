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

export function useSaveOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: OrganizationInput }) =>
      id ? organizationsRepository.update(id, input) : organizationsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    },
  })
}
