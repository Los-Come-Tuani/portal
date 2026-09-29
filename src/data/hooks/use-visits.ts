import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { visitsRepository, type VisitFilters } from '../repositories/visits.repository'
import { queryKeys } from './query-keys'

export { useCircuits } from './use-circuits'

export function useVisitEvents(filters: VisitFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.visits.events(filters),
    queryFn: () => visitsRepository.listEvents(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}
