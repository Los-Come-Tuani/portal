import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BenefitType, CampaignInput, CouponCampaign } from '../models'
import { couponsRepository, type CampaignFilters, type RedemptionFilters } from '../repositories/coupons.repository'
import { useMutation } from './mutation'
import { queryKeys } from './query-keys'

export function useCampaigns(filters: CampaignFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.coupons.campaigns(filters),
    queryFn: () => couponsRepository.list(filters),
    enabled,
  })
}

export function useBenefitTypes() {
  return useQuery({ queryKey: queryKeys.coupons.benefitTypes, queryFn: couponsRepository.benefitTypes, staleTime: 30 * 60_000 })
}

function useCampaignMutation<T>(mutationFn: (variables: T) => Promise<CouponCampaign>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all }) })
}

export function useSaveCampaign() {
  return useCampaignMutation(({ current, input, benefitType }: { current: CouponCampaign | null; input: CampaignInput; benefitType?: BenefitType }) =>
    current ? couponsRepository.update(current, input) : couponsRepository.create(input, benefitType),
  )
}

export function useWithdrawCampaign() {
  return useCampaignMutation(({ id, reason }: { id: string; reason: string }) => couponsRepository.withdraw(id, reason))
}

export function useRedemptions(filters: RedemptionFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.coupons.redemptions(filters),
    queryFn: () => couponsRepository.redemptions(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Busca un código entre los vigentes sin consumirlo, para confirmar qué cupón es. El error va en el campo del diálogo. */
export function useFindCoupon() {
  return useMutation({ mutationFn: (code: string) => couponsRepository.find(code), meta: { errorToast: false } })
}

/** Valida el código en el mostrador: el cupón queda usado. El error se lee dentro del diálogo. */
export function useConsumeCoupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => couponsRepository.validate(code),
    meta: { errorToast: false },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
    },
  })
}
