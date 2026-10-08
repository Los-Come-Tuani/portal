import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { moderationRepository, type DisputeFilters } from '../repositories/moderation.repository'
import { queryKeys } from './query-keys'

export function useDisputes(filters: DisputeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.moderation.disputes(filters),
    queryFn: () => moderationRepository.disputes(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useResolveDispute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, upheld, note }: { id: string; upheld: boolean; note: string }) => moderationRepository.resolveDispute(id, upheld, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all }),
  })
}
