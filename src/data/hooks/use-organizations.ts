import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Organization, OrganizationInput } from '../models'
import { organizationsRepository, type OrganizationFilters } from '../repositories/organizations.repository'
import { placesRepository } from '../repositories/places.repository'
import { useMutation } from './mutation'
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

/** Le asigna a una organización varios lugares sin dueño, uno por uno (`PUT place/{id}/owner/`). */
export function useAssignStops() {
  const onSuccess = useInvalidateOrganizations()
  return useMutation({
    mutationFn: async ({ organization, stopIds }: { organization: Organization; stopIds: string[] }) => {
      for (const stopId of stopIds) await placesRepository.setOwner(stopId, ownerRef(organization))
    },
    onSuccess,
  })
}

/** Le quita un lugar: vuelve a ser del equipo. */
export function useRemoveStop() {
  const onSuccess = useInvalidateOrganizations()
  return useMutation({ mutationFn: (stopId: string) => placesRepository.setOwner(stopId, null), onSuccess })
}

/** El portal todavía no distingue instituciones: una organización es un comercio o una alcaldía. */
const ownerRef = (organization: Organization) => ({
  kind: organization.type === 'negocio' ? ('business' as const) : ('municipality' as const),
  id: organization.id,
})
