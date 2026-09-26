import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BackgroundCheckInput, BackgroundCheckType, DecisionInput, DocumentReviewInput, GuideApplication } from '../models'
import { guidesRepository, type GuideApplicationFilters } from '../repositories/guides.repository'
import { queryKeys } from './query-keys'

export function useGuideApplications(filters: GuideApplicationFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.guides.list(filters),
    queryFn: () => guidesRepository.list(filters),
    enabled,
  })
}

export function useGuideApplication(applicationId: string) {
  return useQuery({
    queryKey: queryKeys.guides.detail(applicationId),
    queryFn: () => guidesRepository.get(applicationId),
    enabled: !!applicationId,
  })
}

export function useReviewers() {
  return useQuery({ queryKey: queryKeys.guides.reviewers, queryFn: guidesRepository.reviewers, staleTime: 5 * 60_000 })
}

type Action =
  | { kind: 'assign'; assigneeId: string | null }
  | { kind: 'document'; documentId: string; input: DocumentReviewInput }
  | { kind: 'check'; checkType: BackgroundCheckType; input: BackgroundCheckInput }
  | { kind: 'advance' }
  | { kind: 'request-changes'; note: string }
  | { kind: 'decide'; input: DecisionInput }

function run(applicationId: string, action: Action): Promise<GuideApplication> {
  switch (action.kind) {
    case 'assign':
      return guidesRepository.assign(applicationId, action.assigneeId)
    case 'document':
      return guidesRepository.reviewDocument(applicationId, action.documentId, action.input)
    case 'check':
      return guidesRepository.recordCheck(applicationId, action.checkType, action.input)
    case 'advance':
      return guidesRepository.advance(applicationId)
    case 'request-changes':
      return guidesRepository.requestChanges(applicationId, action.note)
    case 'decide':
      return guidesRepository.decide(applicationId, action.input)
  }
}

/** Todo lo que se hace sobre una solicitud devuelve la solicitud actualizada. */
export function useGuideAction(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: Action) => run(applicationId, action),
    onSuccess: (application) => {
      queryClient.setQueryData(queryKeys.guides.detail(applicationId), application)
      queryClient.invalidateQueries({ queryKey: ['guides', 'list'] })
      if (application.status === 'approved' || application.status === 'rejected') {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      }
    },
  })
}
