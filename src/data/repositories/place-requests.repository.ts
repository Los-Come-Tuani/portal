import { env } from '@/config/env'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { PlaceRequest, PlaceRequestInput, PlaceRequestStatus } from '../models'

export interface PlaceRequestFilters {
  status?: PlaceRequestStatus
}

/** Pedidos de organizaciones aprobadas para administrar otro lugar. */
export const placeRequestsRepository = {
  // El API no tiene pedidos de lugar (el equipo da el dueño con `place/{id}/owner/`): con el API
  // real no hay ninguno pendiente, en vez de un 404 en el menú y en los pendientes.
  list: async (filters: PlaceRequestFilters = {}): Promise<PlaceRequest[]> =>
    env.useMocks ? http.get<PlaceRequest[]>(endpoints.placeRequests.list, { query: { ...filters } }) : [],
  create: (input: PlaceRequestInput) => http.post<PlaceRequest>(endpoints.placeRequests.list, { body: input }),
  decide: (requestId: string, input: { decision: 'approved' | 'rejected'; note: string }) =>
    http.post<PlaceRequest>(endpoints.placeRequests.decision(requestId), { body: input }),
}
