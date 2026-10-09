import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SanctionInput } from '../models'
import { moderationRepository, type DisputeFilters, type ReportFilters, type SanctionFilters } from '../repositories/moderation.repository'
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

export function useReports(filters: ReportFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.moderation.reports(filters),
    queryFn: () => moderationRepository.reports(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useResolveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'handled' | 'dismissed'; note: string }) => moderationRepository.resolveReport(id, status, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all }),
  })
}

export function useSanctions(filters: SanctionFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.moderation.sanctions(filters),
    queryFn: () => moderationRepository.sanctions(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Sancionar o levantar una sanción cambia también el estado de la cuenta en el directorio. */
function useSanctionMutation<T>(mutationFn: (variables: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useCreateSanction() {
  return useSanctionMutation((input: SanctionInput) => moderationRepository.sanction(input))
}

export function useLiftSanction() {
  return useSanctionMutation((sanctionId: string) => moderationRepository.liftSanction(sanctionId))
}
