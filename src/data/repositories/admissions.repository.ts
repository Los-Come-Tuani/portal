import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type {
  ApplicationStatus,
  AssistedApplicationInput,
  AuthResponse,
  DecisionInput,
  DocumentReviewInput,
  OrganizationApplication,
  OrganizationApplicationInput,
  Reviewer,
  UploadedFile,
} from '../models'

export interface AdmissionFilters {
  status?: ApplicationStatus
}

/** Solicitudes de negocios y alcaldías para entrar a K'Plan. */
export const admissionsRepository = {
  upload: (file: File) => http.upload<UploadedFile>(endpoints.uploads, file),
  /** Pública: crea la cuenta, la organización en revisión y la solicitud, y deja la sesión abierta. */
  apply: (input: OrganizationApplicationInput) =>
    http.post<AuthResponse>(endpoints.organizationApplications.list, { body: input }),

  createAssisted: (input: AssistedApplicationInput) =>
    http.post<OrganizationApplication>(endpoints.organizationApplications.assisted, { body: input }),
  list: (filters: AdmissionFilters = {}) =>
    http.get<OrganizationApplication[]>(endpoints.organizationApplications.list, { query: { ...filters } }),
  get: (applicationId: string) => http.get<OrganizationApplication>(endpoints.organizationApplications.detail(applicationId)),
  reviewers: () => http.get<Reviewer[]>(endpoints.organizationApplications.reviewers),
  assign: (applicationId: string, assigneeId: string | null) =>
    http.post<OrganizationApplication>(endpoints.organizationApplications.assign(applicationId), { body: { assigneeId } }),
  reviewDocument: (applicationId: string, documentId: string, input: DocumentReviewInput) =>
    http.post<OrganizationApplication>(endpoints.organizationApplications.review(applicationId, documentId), { body: input }),
  advance: (applicationId: string) => http.post<OrganizationApplication>(endpoints.organizationApplications.advance(applicationId)),
  requestChanges: (applicationId: string, note: string) =>
    http.post<OrganizationApplication>(endpoints.organizationApplications.requestChanges(applicationId), { body: { note } }),
  decide: (applicationId: string, input: DecisionInput) =>
    http.post<OrganizationApplication>(endpoints.organizationApplications.decision(applicationId), { body: input }),
}
