import { env } from '@/config/env'
import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { VisitEvent } from '../models'

export interface VisitFilters {
  stopIds?: string[]
  from: string
  to: string
}

export const visitsRepository = {
  // El API todavía no publica las llegadas (docs/servicios.md, "Lo que queda para después"): con el
  // API real no hay ninguna, en vez de un 404 que la persona no puede resolver.
  listEvents: async (filters: VisitFilters): Promise<VisitEvent[]> =>
    env.useMocks ? http.get<VisitEvent[]>(endpoints.visitEvents, { query: { ...filters } }) : [],
}

export const demoRepository = {
  /** Sólo en modo demo: vuelve a sembrar los datos de prueba. */
  reset: () => http.post<void>(endpoints.demoReset),
  /** Sólo en modo demo: hace de equipo de K'Plan y resuelve la solicitud de quien entró. */
  decideApplication: (decision: 'approved' | 'rejected') => http.post<void>(endpoints.demoDecision, { body: { decision } }),
}
