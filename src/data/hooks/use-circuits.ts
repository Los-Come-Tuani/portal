import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CircuitInput } from '../models'
import { circuitsRepository } from '../repositories/circuits.repository'
import { queryKeys } from './query-keys'

/** El catálogo de circuitos; la agenda también lo usa para nombrar a los grupos. */
export function useCircuits() {
  return useQuery({
    queryKey: queryKeys.circuits.list,
    queryFn: circuitsRepository.list,
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

export function useGroupSessions(circuitId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.circuits.sessions(circuitId ?? ''),
    queryFn: () => circuitsRepository.groupSessions(circuitId ?? ''),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.circuits.list })
    },
  })
}

export function useDeleteCircuit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (circuitId: string) => circuitsRepository.remove(circuitId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.circuits.all }),
  })
}
