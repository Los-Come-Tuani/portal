import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { PlaceRequest, PlaceRequestInput, PlaceRequestStatus } from '../models'

export interface PlaceRequestFilters {
  status?: PlaceRequestStatus
}

/** Pedidos de organizaciones aprobadas para administrar otro lugar. */
export const placeRequestsRepository = {
  list: (filters: PlaceRequestFilters = {}) => http.get<PlaceRequest[]>(endpoints.placeRequests.list, { query: { ...filters } }),
  create: (input: PlaceRequestInput) => http.post<PlaceRequest>(endpoints.placeRequests.list, { body: input }),
  decide: (requestId: string, input: { decision: 'approved' | 'rejected'; note: string }) =>
    http.post<PlaceRequest>(endpoints.placeRequests.decision(requestId), { body: input }),
}
