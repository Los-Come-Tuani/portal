import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TariffInput } from '../models'
import { billingRepository, type PaymentFilters, type StatementFilters, type WithdrawalFilters } from '../repositories/billing.repository'
import { queryKeys } from './query-keys'

export function usePayments(filters: PaymentFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.payments(filters),
    queryFn: () => billingRepository.payments(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useWithdrawals(filters: WithdrawalFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.withdrawals(filters),
    queryFn: () => billingRepository.withdrawals(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useStatements(filters: StatementFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.billing.statements(filters),
    queryFn: () => billingRepository.statements(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useTariffs(enabled = true) {
  return useQuery({ queryKey: queryKeys.billing.pricing, queryFn: billingRepository.tariffs, enabled })
}

/** Toda acción del equipo sobre el dinero vuelve a pedir las listas de finanzas. */
function useBillingMutation<T, R>(mutationFn: (variables: T) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.billing.all }) })
}

export function useConfirmPayment() {
  return useBillingMutation(({ id, reference }: { id: string; reference: string }) => billingRepository.confirmPayment(id, reference))
}

export function useRefundPayment() {
  return useBillingMutation(({ id, reference }: { id: string; reference: string }) => billingRepository.refundPayment(id, reference))
}

export function usePayWithdrawal() {
  return useBillingMutation(({ id, reference }: { id: string; reference: string }) => billingRepository.payWithdrawal(id, reference))
}

export function useRejectWithdrawal() {
  return useBillingMutation(({ id, note }: { id: string; note: string }) => billingRepository.rejectWithdrawal(id, note))
}

export function usePayStatement() {
  return useBillingMutation(({ id, reference }: { id: string; reference: string }) => billingRepository.payStatement(id, reference))
}

export function useUpdateTariffs() {
  return useBillingMutation(({ input, current }: { input: TariffInput; current: TariffInput }) => billingRepository.updateTariffs(input, current))
}
