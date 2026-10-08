import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CulturalEvent, EventInput } from '../models'
import { eventsRepository, type EventFilters } from '../repositories/events.repository'
import { queryKeys } from './query-keys'

export function useEvents(filters: EventFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => eventsRepository.list(filters),
    enabled,
  })
}

export function useEventCategories() {
  return useQuery({ queryKey: queryKeys.events.categories, queryFn: eventsRepository.categories, staleTime: 30 * 60_000 })
}

function useEventMutation<T>(mutationFn: (variables: T) => Promise<CulturalEvent>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  })
}

export function useSaveEvent() {
  return useEventMutation(({ id, input, moderator }: { id?: string; input: EventInput; moderator: boolean }) =>
    id ? eventsRepository.update(id, input, moderator) : eventsRepository.create(input, moderator),
  )
}

export function useFeatureEvent() {
  return useEventMutation(({ id, featured }: { id: string; featured: boolean }) => eventsRepository.feature(id, featured))
}

export function useCancelEvent() {
  return useEventMutation(({ id, reason }: { id: string; reason: string }) => eventsRepository.cancel(id, reason))
}

export function useCloneEvent() {
  return useEventMutation(({ id, startDate, endDate }: { id: string; startDate: string; endDate: string }) =>
    eventsRepository.clone(id, { startDate, endDate }),
  )
}

export function useHideEvent() {
  return useEventMutation(({ id, reason }: { id: string; reason: string }) => eventsRepository.hide(id, reason))
}

export function useShowEvent() {
  return useEventMutation((id: string) => eventsRepository.show(id))
}
