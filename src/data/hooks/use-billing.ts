import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PricingInput } from '../models'
import { billingRepository } from '../repositories/billing.repository'
import { queryKeys } from './query-keys'

export function useStatements(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.statements(organizationId),
    queryFn: () => billingRepository.listStatements(organizationId),
    enabled,
  })
}

export function usePayStatement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (statementId: string) => billingRepository.pay(statementId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.billing.all }),
  })
}

export function usePricing(enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.pricing,
    queryFn: billingRepository.getPricing,
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function useUpdatePricing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PricingInput) => billingRepository.updatePricing(input),
    onSuccess: (pricing) => {
      queryClient.setQueryData(queryKeys.billing.pricing, pricing)
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}
