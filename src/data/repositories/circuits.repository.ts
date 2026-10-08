import { z } from 'zod'
import { endpoints } from '../api/endpoints'
import { renameFieldErrors } from '../api/errors'
import { http } from '../api/http-client'
import type { Circuit, CircuitFilters, CircuitInput, Departure } from '../models'
import {
  apiCircuitDetailSchema,
  apiCircuitPageSchema,
  apiCircuitSchema,
  apiDepartureSchema,
  CIRCUIT_FORM_FIELDS,
  circuitBody,
  toCircuit,
  toCircuitPage,
  toDeparture,
} from '../schemas/circuit-api.schema'
import { allPages } from './pages'

/** El circuito que responde el API; un error por campo sale con el nombre del formulario. */
async function circuit(request: Promise<unknown>): Promise<Circuit> {
  try {
    return toCircuit(apiCircuitDetailSchema.parse(await request))
  } catch (error) {
    throw renameFieldErrors(error, CIRCUIT_FORM_FIELDS)
  }
}

/**
 * Los circuitos oficiales del portal (docs/territorio.md del repo del API). El API decide qué ve
 * cada quien: el equipo con `circuits.view`, todos; una alcaldía verificada, los de su ciudad.
 */
export const circuitsRepository = {
  /** Todos los que dejan ver los filtros, juntando las páginas: son pocos por ciudad. */
  list: (filters: CircuitFilters = {}) =>
    allPages(async (page, pageSize) =>
      toCircuitPage(
        apiCircuitPageSchema.parse(await http.get<unknown>(endpoints.officialCircuit.list, { query: { status: filters.status, page, page_size: pageSize } })),
      ),
    ),

  /** Los publicados como los ve la app, sin sesión: la agenda los usa para nombrar a los grupos. */
  published: async () => z.array(apiCircuitSchema).parse(await http.get<unknown>(endpoints.publishedCircuits)).map(toCircuit),

  get: (circuitId: string) => circuit(http.get<unknown>(endpoints.officialCircuit.detail(circuitId))),

  /** El equipo elige el tipo y la ciudad; la alcaldía siempre crea creativos de la suya. */
  create: (input: CircuitInput) => circuit(http.post<unknown>(endpoints.officialCircuit.list, { body: circuitBody(input) })),

  update: (circuitId: string, input: CircuitInput) => circuit(http.put<unknown>(endpoints.officialCircuit.detail(circuitId), { body: circuitBody(input) })),

  /** Lo retira para siempre: sale de la app y ya no se edita. */
  retire: (circuitId: string) => http.delete(endpoints.officialCircuit.detail(circuitId)),

  /** Las próximas salidas de guía, con las canceladas; también las de uno que salió de la app. */
  departures: async (circuitId: string): Promise<Departure[]> =>
    z.array(apiDepartureSchema).parse(await http.get<unknown>(endpoints.officialCircuit.departures(circuitId))).map(toDeparture),
}
