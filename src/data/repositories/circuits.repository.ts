import { endpoints } from '../api/endpoints'
import { http } from '../api/http-client'
import type { Circuit, CircuitInput, GroupSessionView } from '../models'

export const circuitsRepository = {
  list: () => http.get<Circuit[]>(endpoints.circuits.list),
  get: (circuitId: string) => http.get<Circuit>(endpoints.circuits.detail(circuitId)),
  create: (input: CircuitInput) => http.post<Circuit>(endpoints.circuits.list, { body: input }),
  update: (circuitId: string, input: CircuitInput) => http.put<Circuit>(endpoints.circuits.detail(circuitId), { body: input }),
  remove: (circuitId: string) => http.delete(endpoints.circuits.detail(circuitId)),
  groupSessions: (circuitId: string) => http.get<GroupSessionView[]>(endpoints.circuits.groupSessions(circuitId)),
}
