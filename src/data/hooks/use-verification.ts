import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueueFilters, RejectInput, RequestDetail } from '../models'
import { verificationRepository } from '../repositories/verification.repository'
import { useMutation } from './mutation'
import { queryKeys } from './query-keys'

/** La bandeja. Al cambiar de página se sigue mostrando la anterior hasta que llega la nueva. */
export function useVerificationQueue(filters: QueueFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.verification.list(filters),
    queryFn: () => verificationRepository.list(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** Cuántas solicitudes esperan al equipo: lo que lleva el contador del menú. */
export function useOpenRequestCount(enabled = true) {
  const queue = useVerificationQueue({ status: 'open', page: 1, pageSize: 1 }, enabled)
  return queue.data?.elements
}

export function useVerificationRequest(requestId: string) {
  return useQuery({
    queryKey: queryKeys.verification.detail(requestId),
    queryFn: () => verificationRepository.get(requestId),
    enabled: !!requestId,
  })
}

/** Los motivos con que se rechaza no cambian entre solicitudes. */
export function useRejectionReasons(enabled = true) {
  return useQuery({
    queryKey: queryKeys.verification.reasons,
    queryFn: verificationRepository.reasons,
    enabled,
    staleTime: 10 * 60_000,
  })
}

type Action =
  | { kind: 'take' }
  | { kind: 'release' }
  | { kind: 'approve'; note: string }
  | { kind: 'reject'; input: RejectInput }

function run(requestId: string, action: Action): Promise<RequestDetail> {
  switch (action.kind) {
    case 'take':
      return verificationRepository.take(requestId)
    case 'release':
      return verificationRepository.release(requestId)
    case 'approve':
      return verificationRepository.approve(requestId, action.note)
    case 'reject':
      return verificationRepository.reject(requestId, action.input)
  }
}

/** Todo lo que se hace sobre un expediente devuelve el expediente como queda. */
export function useVerificationAction(requestId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: Action) => run(requestId, action),
    onSuccess: (request) => {
      queryClient.setQueryData(queryKeys.verification.detail(requestId), request)
      queryClient.invalidateQueries({ queryKey: ['verification', 'list'] })
      if (request.status === 'approved' || request.status === 'rejected') {
        // Aprobar hace visible a la organización: lo que dependa de ella se vuelve a pedir.
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      }
    },
  })
}
