import { addDays, nowMinutes, todayISO } from '@/lib/dates'
import { endpoints } from '../../api/endpoints'
import type { VisitEvent } from '../../models'
import { getVisitEvents } from '../generators/visits'
import { requireUser, route } from '../http'
import { ownStopIds } from '../services/access'

function eventDate(event: VisitEvent): string {
  return (event.type === 'planned_visit' ? event.arrival : event.recordedAt).slice(0, 10)
}

export const visitRoutes = [
  route('GET', endpoints.circuits.list, (context) => {
    requireUser(context)
    return context.db.circuits
  }),

  /** Visitas planeadas, check-ins y abandonos de los lugares pedidos, por fecha. */
  route('GET', endpoints.visitEvents, (context) => {
    const user = requireUser(context)
    const today = todayISO()
    const allowed = ownStopIds(context.db, user)
    const requested = context.query.get('stopIds')?.split(',').filter(Boolean)
    const everything = !requested && !allowed
    const stopIds = new Set(requested ? requested.filter((id) => !allowed || allowed.has(id)) : (allowed ?? []))
    const from = context.query.get('from') ?? addDays(today, -6)
    const to = context.query.get('to') ?? addDays(today, 7)
    return getVisitEvents(today, nowMinutes()).filter((event) => {
      if (!everything && !stopIds.has(event.stopId)) return false
      const date = eventDate(event)
      return date >= from && date <= to
    })
  }),
]
