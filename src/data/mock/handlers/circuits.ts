import { checkStartTimes, deriveCircuit } from '@/lib/circuits'
import { addDays, todayISO } from '@/lib/dates'
import { plural } from '@/lib/format'
import { uniqueSlug } from '@/lib/slug'
import { parseClock } from '@/lib/time'
import { endpoints } from '../../api/endpoints'
import type { Circuit, CircuitInput, GroupSessionView, Stop } from '../../models'
import { circuitInputSchema } from '../../schemas/circuit.schema'
import { catalog } from '../catalog'
import type { MockDatabase } from '../db'
import { fail, parseBody, requireUser, route, type MockContext } from '../http'
import { hasPermission } from '../services/access'

const MANAGERS = ['circuits.manage'] as const

function findCircuit(db: MockDatabase, circuitId: string): Circuit {
  const circuit = db.circuits.find((item) => item.id === circuitId)
  if (!circuit) throw fail.notFound('No encontramos ese circuito')
  return circuit
}

function joinedIn(db: MockDatabase, circuitId: string): number {
  return db.groupSessions.filter((session) => session.circuitId === circuitId).reduce((sum, session) => sum + session.joinedCount, 0)
}

/** Valida contra el catálogo y arma el circuito con sus campos calculados. */
function toCircuit(db: MockDatabase, input: CircuitInput, existing?: Circuit): Omit<Circuit, 'id'> {
  const invalid = (field: string, message: string) => fail.invalid('Revisa los campos marcados', { [field]: message })

  const stops: Stop[] = input.stopIds.map((stopId) => {
    const stop = db.stops.find((item) => item.id === stopId && !item.draft)
    if (!stop) throw invalid('stopIds', 'Una de las paradas ya no está en la app')
    if (stop.city !== input.city) throw invalid('stopIds', `${stop.name} es de ${stop.city}: todas las paradas son de ${input.city}`)
    return stop
  })

  let organizer: string | undefined
  if (input.kind === 'creative') {
    const alcaldia = db.organizations.find((item) => item.type === 'alcaldia' && item.name === input.organizer && item.status === 'active')
    if (!alcaldia) throw invalid('organizer', 'Elige una alcaldía activa')
    if (alcaldia.city !== input.city) throw invalid('organizer', `${alcaldia.name} no es de ${input.city}`)
    organizer = alcaldia.name
  }

  const group = input.kind === 'creative' || (input.kind === 'kplan' && input.bookingMode === 'group')
  const joined = existing ? joinedIn(db, existing.id) : 0
  if (joined > 0 && !group) {
    throw invalid('bookingMode', `Tiene ${plural(joined, 'persona inscrita', 'personas inscritas')} en horarios de grupo: sigue siendo en grupo mientras los tenga`)
  }
  if (joined > 0 && input.draft && !existing?.draft) {
    throw invalid('draft', `Tiene ${plural(joined, 'persona inscrita', 'personas inscritas')} en horarios de grupo: no se puede sacar de la app mientras los tenga`)
  }

  const legMinutes = Object.fromEntries(Object.entries(input.legMinutes ?? {}).filter(([stopId]) => input.stopIds.includes(stopId)))
  const startTimes = [...input.startTimes].sort((a, b) => (parseClock(a) ?? 0) - (parseClock(b) ?? 0))
  if (!input.draft) {
    const problem = checkStartTimes({ stops, travelMode: input.travelMode, legMinutes }, startTimes).find((check) => check.blocking.length > 0)
    if (problem) throw invalid('startTimes', `Saliendo a las ${problem.startTime}: ${problem.blocking[0].message}. Cambia la hora o guárdalo como borrador.`)
  }

  const kplan = input.kind === 'kplan'
  const circuit: Omit<Circuit, 'id'> = {
    title: input.title,
    shortTitle: input.shortTitle,
    subtitle: input.subtitle,
    category: input.category,
    city: input.city,
    rating: existing?.rating ?? 0,
    reviewsCount: existing?.reviewsCount ?? 0,
    stopIds: input.stopIds,
    travelMode: input.travelMode,
    ...(Object.keys(legMinutes).length > 0 ? { legMinutes } : {}),
    ...deriveCircuit({ stops, travelMode: input.travelMode, legMinutes, kind: input.kind, bonusBadges: input.bonusBadges, city: input.city }),
    difficulty: input.difficulty,
    priceAdult: input.priceAdult,
    priceChild: input.priceChild,
    description: input.description,
    images: input.images,
    recommendations: input.recommendations,
    meetingPoint: input.meetingPoint,
    location: input.location,
    includes: input.includes,
    notes: input.notes,
    startTimes,
    comments: existing?.comments ?? [],
    ...(input.kind === 'creative' ? { isCreativeCircuit: true, organizer } : {}),
    ...(kplan ? { isKplanCircuit: true, bonusBadges: input.bonusBadges, bookingMode: input.bookingMode } : {}),
    ...(kplan && input.availableFrom && input.availableUntil ? { availableFrom: input.availableFrom, availableUntil: input.availableUntil } : {}),
    ...(input.draft ? { draft: true } : {}),
  }
  return circuit
}

export const circuitRoutes = [
  route('GET', endpoints.circuits.list, (context: MockContext) => {
    const user = requireUser(context)
    const manager = hasPermission(context.db, user, MANAGERS)
    return context.db.circuits.filter((circuit) => manager || !circuit.draft)
  }),
  route('GET', endpoints.circuits.detail(':id'), (context: MockContext) => {
    const user = requireUser(context)
    const circuit = findCircuit(context.db, context.params.id)
    if (circuit.draft && !hasPermission(context.db, user, MANAGERS)) throw fail.notFound('No encontramos ese circuito')
    return circuit
  }),
  route(
    'POST',
    endpoints.circuits.list,
    ({ db, body }) => {
      const input = parseBody(circuitInputSchema, body)
      const data = toCircuit(db, input)
      const base = input.kind === 'kplan' ? `kplan-${input.shortTitle}` : input.title
      const circuit: Circuit = { id: uniqueSlug(base, (id) => db.circuits.some((item) => item.id === id)), ...data }
      db.circuits.push(circuit)
      return circuit
    },
    { permissions: [...MANAGERS] },
  ),
  route(
    'PUT',
    endpoints.circuits.detail(':id'),
    ({ db, body, params }) => {
      const circuit = findCircuit(db, params.id)
      const next: Circuit = { id: circuit.id, ...toCircuit(db, parseBody(circuitInputSchema, body), circuit) }
      db.circuits = db.circuits.map((item) => (item.id === circuit.id ? next : item))
      return next
    },
    { permissions: [...MANAGERS] },
  ),
  route(
    'DELETE',
    endpoints.circuits.detail(':id'),
    ({ db, params }) => {
      const circuit = findCircuit(db, params.id)
      const joined = joinedIn(db, circuit.id)
      if (joined > 0) {
        throw fail.conflict(`Tiene ${plural(joined, 'persona inscrita', 'personas inscritas')} en horarios de grupo: no se puede borrar mientras los tenga`)
      }
      db.circuits = db.circuits.filter((item) => item.id !== circuit.id)
      db.groupSessions = db.groupSessions.filter((session) => session.circuitId !== circuit.id)
      return undefined
    },
    { permissions: [...MANAGERS] },
  ),
  route('GET', endpoints.circuits.groupSessions(':id'), (context: MockContext): GroupSessionView[] => {
    requireUser(context)
    const circuit = findCircuit(context.db, context.params.id)
    const today = todayISO()
    return context.db.groupSessions
      .filter((session) => session.circuitId === circuit.id)
      .map((session) => ({
        id: session.id,
        circuitId: session.circuitId,
        date: addDays(today, session.daysFromNow),
        startTime: session.startTime,
        capacity: session.capacity,
        joinedCount: session.joinedCount,
        guideName: catalog.appGuides.find((guide) => guide.id === session.guideId)?.name ?? 'Guía certificado',
        transportIncluded: session.transportIncluded,
        note: session.note,
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || (parseClock(a.startTime) ?? 0) - (parseClock(b.startTime) ?? 0))
  }),
]
