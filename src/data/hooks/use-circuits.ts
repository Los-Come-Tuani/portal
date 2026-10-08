import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CircuitFilters, CircuitInput } from '../models'
import { circuitsRepository } from '../repositories/circuits.repository'
import { queryKeys } from './query-keys'

/** Los circuitos oficiales que ve quien entró: el equipo, todos; una alcaldía, los de su ciudad. */
export function useCircuitList(filters: CircuitFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.circuits.list(filters),
    queryFn: () => circuitsRepository.list(filters),
    enabled,
  })
}

/** Los publicados, como los ve la app: la agenda los usa para nombrar a los grupos. */
export function useCircuits() {
  return useQuery({
    queryKey: queryKeys.circuits.published,
    queryFn: circuitsRepository.published,
    staleTime: 5 * 60_000,
  })
}

export function useCircuit(circuitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.circuits.detail(circuitId ?? ''),
    queryFn: () => circuitsRepository.get(circuitId ?? ''),
    enabled: !!circuitId,
  })
}

/** Las próximas salidas de guía de un circuito, con las canceladas. */
export function useDepartures(circuitId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.circuits.departures(circuitId ?? ''),
    queryFn: () => circuitsRepository.departures(circuitId ?? ''),
    enabled: !!circuitId && enabled,
  })
}

export function useSaveCircuit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CircuitInput }) =>
      id ? circuitsRepository.update(id, input) : circuitsRepository.create(input),
    onSuccess: (circuit) => {
      queryClient.setQueryData(queryKeys.circuits.detail(circuit.id), circuit)
      queryClient.invalidateQueries({ queryKey: queryKeys.circuits.all, predicate: (query) => query.queryKey[1] !== 'detail' })
      // Un lugar en un circuito publicado ya no se retira.
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    },
  })
}

export function useRetireCircuit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (circuitId: string) => circuitsRepository.retire(circuitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.circuits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    },
  })
}
