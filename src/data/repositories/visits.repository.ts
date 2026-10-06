import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { VisitEvent } from '../models'

export interface VisitFilters {
  stopIds?: string[]
  from: string
  to: string
}

export const visitsRepository = {
  listEvents: (filters: VisitFilters) => http.get<VisitEvent[]>(endpoints.visitEvents, { query: { ...filters } }),
}

export const demoRepository = {
  /** Sólo en modo demo: vuelve a sembrar los datos de prueba. */
  reset: () => http.post<void>(endpoints.demoReset),
  /** Sólo en modo demo: hace de equipo de K'Plan y resuelve la solicitud de quien entró. */
  decideApplication: (decision: 'approved' | 'rejected') => http.post<void>(endpoints.demoDecision, { body: { decision } }),
}
