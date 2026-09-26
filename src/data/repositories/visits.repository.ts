import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { Circuit, VisitEvent } from '../models'

export interface VisitFilters {
  stopIds?: string[]
  from: string
  to: string
}

export const visitsRepository = {
  listEvents: (filters: VisitFilters) => http.get<VisitEvent[]>(endpoints.visitEvents, { query: { ...filters } }),
  listCircuits: () => http.get<Circuit[]>(endpoints.circuits.list),
}

export const demoRepository = {
  /** Sólo en modo demo: vuelve a sembrar los datos de prueba. */
  reset: () => http.post<void>(endpoints.demoReset),
}
