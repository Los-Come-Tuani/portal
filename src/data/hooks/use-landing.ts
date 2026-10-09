import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AppReleaseChange, AppReleaseInput, DemoRequestChange } from '../models'
import { landingRepository, type DemoRequestFilters, type ReleaseFilters } from '../repositories/landing.repository'
import { queryKeys } from './query-keys'

export function useDemoRequests(filters: DemoRequestFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.landing.demoRequests(filters),
    queryFn: () => landingRepository.demoRequests(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Cuántas solicitudes de demo nadie ha atendido: alimenta el menú y los pendientes. */
export function usePendingDemoCount(enabled = true) {
  const queue = useDemoRequests({ status: 'pending', page: 1, pageSize: 1 }, enabled)
  return queue.data?.elements
}

export function useUpdateDemoRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: DemoRequestChange }) => landingRepository.updateDemoRequest(id, change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.landing.all }),
  })
}

export function useReleases(filters: ReleaseFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.landing.releases(filters),
    queryFn: () => landingRepository.releases(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

function useReleaseMutation<T>(mutationFn: (variables: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.landing.all }),
  })
}

export function useCreateRelease() {
  return useReleaseMutation((input: AppReleaseInput) => landingRepository.createRelease(input))
}

export function useUpdateRelease() {
  return useReleaseMutation(({ id, change }: { id: string; change: AppReleaseChange }) => landingRepository.updateRelease(id, change))
}

export function usePublishRelease() {
  return useReleaseMutation((releaseId: string) => landingRepository.publishRelease(releaseId))
}

export function useWithdrawRelease() {
  return useReleaseMutation((releaseId: string) => landingRepository.withdrawRelease(releaseId))
}

export function useDeleteRelease() {
  return useReleaseMutation((releaseId: string) => landingRepository.deleteRelease(releaseId))
}
