import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadFile } from '../api/upload'
import { isOpen, type ApplicantInput, type OrganizationData, type UploadKind } from '../models'
import { applicationsRepository } from '../repositories/applications.repository'
import { queryKeys } from './query-keys'

/** Las ciudades y los tipos casi no cambian: se piden una vez por visita. */
const CATALOG_STALE_MS = 24 * 60 * 60_000

export function useCities() {
  return useQuery({ queryKey: queryKeys.catalog.cities, queryFn: applicationsRepository.cities, staleTime: CATALOG_STALE_MS })
}

export function useBusinessTypes() {
  return useQuery({
    queryKey: queryKeys.catalog.businessTypes,
    queryFn: applicationsRepository.businessTypes,
    staleTime: CATALOG_STALE_MS,
  })
}

export function useInstitutionTypes() {
  return useQuery({
    queryKey: queryKeys.catalog.institutionTypes,
    queryFn: applicationsRepository.institutionTypes,
    staleTime: CATALOG_STALE_MS,
  })
}

/** Sube un archivo directo al almacenamiento y devuelve su clave. */
export function useUploadFile(kind: UploadKind) {
  return useMutation({ mutationFn: (file: File) => uploadFile(kind, file) })
}

export function useRequestCode() {
  return useMutation({ mutationFn: (email: string) => applicationsRepository.requestCode(email) })
}

export function useVerifyCode() {
  return useMutation({ mutationFn: ({ email, code }: { email: string; code: string }) => applicationsRepository.verifyCode(email, code) })
}

export function useApply() {
  return useMutation({
    mutationFn: ({ applicant, data }: { applicant: ApplicantInput; data: OrganizationData }) =>
      applicationsRepository.apply(applicant, data),
  })
}

/** Mientras la solicitud espera al equipo se vuelve a preguntar de vez en cuando: así se entera de la decisión. */
const OPEN_REFETCH_MS = 30_000

/** La solicitud de quien entró; `enabled` falso mientras no hay sesión de una organización. */
export function useMyApplication(enabled = true) {
  return useQuery({
    queryKey: queryKeys.applications.mine,
    queryFn: applicationsRepository.mine,
    enabled,
    refetchInterval: (query) => (query.state.data && isOpen(query.state.data.status) ? OPEN_REFETCH_MS : false),
  })
}

export function useResubmitApplication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: OrganizationData) => applicationsRepository.resubmit(data),
    onSuccess: (application) => queryClient.setQueryData(queryKeys.applications.mine, application),
  })
}
