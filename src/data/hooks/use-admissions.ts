import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApplicationDocumentInput, DecisionInput, DocumentReviewInput, OrganizationApplication } from '../models'
import { admissionsRepository, type AdmissionFilters } from '../repositories/admissions.repository'
import { queryKeys } from './query-keys'

export function useUploadFile() {
  return useMutation({ mutationFn: (file: File) => admissionsRepository.upload(file) })
}

// ── Quien se postula ─────────────────────────────────────────────────────

export function useMyApplication(enabled = true) {
  return useQuery({ queryKey: queryKeys.admissions.mine, queryFn: admissionsRepository.mine, enabled })
}

export function useReplaceDocument(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ApplicationDocumentInput) => admissionsRepository.replaceDocument(applicationId, input),
    onSuccess: (application) => queryClient.setQueryData(queryKeys.admissions.mine, application),
  })
}

export function useResubmit(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => admissionsRepository.resubmit(applicationId),
    onSuccess: (application) => queryClient.setQueryData(queryKeys.admissions.mine, application),
  })
}

// ── Equipo de K'Plan ─────────────────────────────────────────────────────

export function useAdmissions(filters: AdmissionFilters = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admissions.list(filters),
    queryFn: () => admissionsRepository.list(filters),
    enabled,
  })
}

export function useAdmission(applicationId: string) {
  return useQuery({
    queryKey: queryKeys.admissions.detail(applicationId),
    queryFn: () => admissionsRepository.get(applicationId),
    enabled: !!applicationId,
  })
}

export function useAdmissionReviewers() {
  return useQuery({ queryKey: queryKeys.admissions.reviewers, queryFn: admissionsRepository.reviewers, staleTime: 5 * 60_000 })
}

type Action =
  | { kind: 'assign'; assigneeId: string | null }
  | { kind: 'document'; documentId: string; input: DocumentReviewInput }
  | { kind: 'advance' }
  | { kind: 'request-changes'; note: string }
  | { kind: 'decide'; input: DecisionInput }

function run(applicationId: string, action: Action): Promise<OrganizationApplication> {
  switch (action.kind) {
    case 'assign':
      return admissionsRepository.assign(applicationId, action.assigneeId)
    case 'document':
      return admissionsRepository.reviewDocument(applicationId, action.documentId, action.input)
    case 'advance':
      return admissionsRepository.advance(applicationId)
    case 'request-changes':
      return admissionsRepository.requestChanges(applicationId, action.note)
    case 'decide':
      return admissionsRepository.decide(applicationId, action.input)
  }
}

/** Todo lo que se hace sobre una solicitud devuelve la solicitud actualizada. */
export function useAdmissionAction(applicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: Action) => run(applicationId, action),
    onSuccess: (application) => {
      queryClient.setQueryData(queryKeys.admissions.detail(applicationId), application)
      queryClient.invalidateQueries({ queryKey: ['admissions', 'list'] })
      if (application.status === 'approved' || application.status === 'rejected') {
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      }
    },
  })
}
