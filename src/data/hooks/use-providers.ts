import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CredentialReviewInput, ProviderQueueFilters, ProviderRequestDetail, RejectInput } from '../models'
import { providersRepository } from '../repositories/providers.repository'
import { queryKeys } from './query-keys'

/** La bandeja de guías y traductores. Al cambiar de página se sigue mostrando la anterior. */
export function useProviderQueue(filters: ProviderQueueFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.providers.list(filters),
    queryFn: () => providersRepository.list(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** Cuántas solicitudes de guías y traductores esperan al equipo: el contador del menú. */
export function useOpenProviderCount(enabled = true) {
  const queue = useProviderQueue({ status: 'open', page: 1, pageSize: 1 }, enabled)
  return queue.data?.elements
}

export function useProviderRequest(requestId: string) {
  return useQuery({
    queryKey: queryKeys.providers.detail(requestId),
    queryFn: () => providersRepository.get(requestId),
    enabled: !!requestId,
  })
}

/** Los motivos con que se rechaza no cambian entre solicitudes. */
export function useProviderReasons(enabled = true) {
  return useQuery({
    queryKey: queryKeys.providers.reasons,
    queryFn: providersRepository.reasons,
    enabled,
    staleTime: 10 * 60_000,
  })
}

export type ProviderAction =
  | { kind: 'take' }
  | { kind: 'release' }
  | { kind: 'review'; input: CredentialReviewInput }
  | { kind: 'request-changes'; note: string }
  | { kind: 'approve'; note: string }
  | { kind: 'reject'; input: RejectInput }

function run(requestId: string, action: ProviderAction): Promise<ProviderRequestDetail> {
  switch (action.kind) {
    case 'take':
      return providersRepository.take(requestId)
    case 'release':
      return providersRepository.release(requestId)
    case 'review':
      return providersRepository.reviewDocument(requestId, action.input)
    case 'request-changes':
      return providersRepository.requestChanges(requestId, action.note)
    case 'approve':
      return providersRepository.approve(requestId, action.note)
    case 'reject':
      return providersRepository.reject(requestId, action.input)
  }
}

/** Todo lo que se hace sobre un expediente devuelve el expediente como queda. */
export function useProviderAction(requestId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: ProviderAction) => run(requestId, action),
    onSuccess: (request) => {
      queryClient.setQueryData(queryKeys.providers.detail(requestId), request)
      queryClient.invalidateQueries({ queryKey: ['providers', 'list'] })
    },
  })
}
