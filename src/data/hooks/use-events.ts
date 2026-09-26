import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EventInput, EventStatus } from '../models'
import { eventsRepository, type EventFilters } from '../repositories/events.repository'
import { queryKeys } from './query-keys'

export function useEvents(filters: EventFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events.list(filters),
    queryFn: () => eventsRepository.list(filters),
    enabled,
  })
}

export function useSaveEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: EventInput }) =>
      id ? eventsRepository.update(id, input) : eventsRepository.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => eventsRepository.remove(eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  })
}

export function useModerateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { status?: EventStatus; featured?: boolean } }) =>
      eventsRepository.moderate(id, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.events.all }),
  })
}
