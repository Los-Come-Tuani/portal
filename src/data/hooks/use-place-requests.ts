import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PlaceRequestInput } from '../models'
import { placeRequestsRepository, type PlaceRequestFilters } from '../repositories/place-requests.repository'
import { useMutation } from './mutation'
import { queryKeys } from './query-keys'

export function usePlaceRequests(filters: PlaceRequestFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.placeRequests.list(filters),
    queryFn: () => placeRequestsRepository.list(filters),
    enabled,
  })
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.placeRequests.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
  }
}

export function useCreatePlaceRequest() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (input: PlaceRequestInput) => placeRequestsRepository.create(input), onSuccess: refresh })
}

export function useDecidePlaceRequest() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'approved' | 'rejected'; note: string }) =>
      placeRequestsRepository.decide(id, { decision, note }),
    onSuccess: refresh,
  })
}
