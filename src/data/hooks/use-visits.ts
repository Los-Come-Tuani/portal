import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { visitsRepository, type VisitFilters } from '../repositories/visits.repository'
import { queryKeys } from './query-keys'

export function useVisitEvents(filters: VisitFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.visits.events(filters),
    queryFn: () => visitsRepository.listEvents(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Nombres de los circuitos del catálogo, para etiquetar a los grupos. */
export function useCircuits() {
  return useQuery({
    queryKey: queryKeys.circuits,
    queryFn: visitsRepository.listCircuits,
    staleTime: 30 * 60_000,
  })
}
