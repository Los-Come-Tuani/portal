import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CouponInput } from '../models'
import { couponsRepository, type RedemptionFilters } from '../repositories/coupons.repository'
import { queryKeys } from './query-keys'

export function useCoupons(organizationId?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.coupons.list(organizationId),
    queryFn: () => couponsRepository.list(organizationId),
    enabled,
  })
}

export function useSaveCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CouponInput }) =>
      id ? couponsRepository.update(id, input) : couponsRepository.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all }),
  })
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (couponId: string) => couponsRepository.remove(couponId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all }),
  })
}

export function useRedemptions(filters: RedemptionFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.coupons.redemptions(filters),
    queryFn: () => couponsRepository.listRedemptions(filters),
    enabled,
  })
}

/** Busca un código sin validarlo, para confirmar qué cupón es. */
export function useLookupRedemption() {
  return useMutation({ mutationFn: (code: string) => couponsRepository.lookup(code) })
}

export function useValidateRedemption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => couponsRepository.validate(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}
