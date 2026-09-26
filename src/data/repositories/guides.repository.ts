import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type {
  ApplicationStatus,
  BackgroundCheckInput,
  BackgroundCheckType,
  DecisionInput,
  DocumentReviewInput,
  GuideApplication,
  Reviewer,
} from '../models'

export interface GuideApplicationFilters {
  status?: ApplicationStatus
}

export const guidesRepository = {
  list: (filters: GuideApplicationFilters = {}) =>
    http.get<GuideApplication[]>(endpoints.guideApplications.list, { query: { ...filters } }),
  get: (applicationId: string) => http.get<GuideApplication>(endpoints.guideApplications.detail(applicationId)),
  reviewers: () => http.get<Reviewer[]>(endpoints.guideApplications.reviewers),
  assign: (applicationId: string, assigneeId: string | null) =>
    http.post<GuideApplication>(endpoints.guideApplications.assign(applicationId), { body: { assigneeId } }),
  reviewDocument: (applicationId: string, documentId: string, input: DocumentReviewInput) =>
    http.post<GuideApplication>(endpoints.guideApplications.document(applicationId, documentId), { body: input }),
  recordCheck: (applicationId: string, checkType: BackgroundCheckType, input: BackgroundCheckInput) =>
    http.post<GuideApplication>(endpoints.guideApplications.check(applicationId, checkType), { body: input }),
  advance: (applicationId: string) => http.post<GuideApplication>(endpoints.guideApplications.advance(applicationId)),
  requestChanges: (applicationId: string, note: string) =>
    http.post<GuideApplication>(endpoints.guideApplications.requestChanges(applicationId), { body: { note } }),
  decide: (applicationId: string, input: DecisionInput) =>
    http.post<GuideApplication>(endpoints.guideApplications.decision(applicationId), { body: input }),
}
