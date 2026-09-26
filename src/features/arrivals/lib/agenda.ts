/**
 * De eventos de visita a lo que muestra la agenda: grupos con su estado,
 * totales por día y por hora, y abandonos. Métricas de CONTEXTO_KPLAN.md 9.2.
 */
import {
  DROP_REASONS,
  isUserCircuit,
  type Circuit,
  type DropReason,
  type StopDropped,
  type VisitEvent,
} from '@/data/models'
import { splitLocalDateTime, type ISODate } from '@/lib/dates'
import { parseClock } from '@/lib/time'

export type GroupStatus = 'upcoming' | 'arriving' | 'arrived' | 'dropped' | 'unconfirmed'

export interface ArrivalGroup {
  key: string
  stopId: string
  circuitId: string
  date: ISODate
  /** Minutos desde la medianoche. */
  arrival: number
  departure: number
  groupSize: number
  status: GroupStatus
  checkedInAt: number | null
  dropReason: DropReason | null
}

/** Un check-in cuenta para una visita si cae en esta ventana alrededor de su estancia. */
const MATCH_BEFORE_MINUTES = 45
const MATCH_AFTER_MINUTES = 90

/**
 * Cruza visitas planeadas con check-ins y abandonos del mismo lugar, circuito
 * y día. El check-in no trae la reserva, así que el cruce es aproximado.
 */
export function buildGroups(events: readonly VisitEvent[], today: ISODate, now: number): ArrivalGroup[] {
  const checkIns = new Map<string, number[]>()
  const drops = new Map<string, StopDropped[]>()

  for (const event of events) {
    if (event.type === 'check_in' && event.circuitId) {
      const { date, minutes } = splitLocalDateTime(event.recordedAt)
      const key = `${event.stopId}|${event.circuitId}|${date}`
      checkIns.set(key, [...(checkIns.get(key) ?? []), minutes])
    } else if (event.type === 'stop_dropped' && event.stage !== 'planning') {
      const key = `${event.stopId}|${event.circuitId}|${event.recordedAt.slice(0, 10)}`
      drops.set(key, [...(drops.get(key) ?? []), event])
    }
  }
  for (const times of checkIns.values()) times.sort((a, b) => a - b)

  const groups: ArrivalGroup[] = []
  for (const event of events) {
    if (event.type !== 'planned_visit') continue
    const arrival = splitLocalDateTime(event.arrival)
    const departure = splitLocalDateTime(event.departure)
    const key = `${event.stopId}|${event.circuitId}|${arrival.date}`

    let checkedInAt: number | null = null
    const times = checkIns.get(key)
    if (times) {
      const index = times.findIndex(
        (time) => time >= arrival.minutes - MATCH_BEFORE_MINUTES && time <= departure.minutes + MATCH_AFTER_MINUTES,
      )
      if (index >= 0) checkedInAt = times.splice(index, 1)[0]
    }
    const dropReason = checkedInAt === null ? (drops.get(key)?.shift()?.reason ?? null) : null

    const isToday = arrival.date === today
    let status: GroupStatus
    if (checkedInAt !== null) status = 'arrived'
    else if (dropReason) status = 'dropped'
    else if (arrival.date > today || (isToday && arrival.minutes > now)) status = 'upcoming'
    else if (isToday && now < departure.minutes) status = 'arriving'
    else status = 'unconfirmed'

    groups.push({
      key: `${event.bookingId ?? event.circuitId}|${event.stopId}|${arrival.minutes}`,
      stopId: event.stopId,
      circuitId: event.circuitId,
      date: arrival.date,
      arrival: arrival.minutes,
      departure: departure.minutes,
      groupSize: event.groupSize,
      status,
      checkedInAt,
      dropReason,
    })
  }
  return groups.sort((a, b) => a.date.localeCompare(b.date) || a.arrival - b.arrival)
}

export interface HourRange {
  start: number
  end: number
}

const DEFAULT_RANGE: HourRange = { start: 7 * 60, end: 19 * 60 }

/**
 * Las horas de la agenda: el horario de los lugares (si todos cierran) o de
 * 7 a.m. a 7 p.m., ampliado si algún grupo llega antes o después.
 */
export function hourRange(
  groups: readonly ArrivalGroup[],
  places: readonly { opensAt?: string; closesAt?: string }[] = [],
): HourRange {
  const hours = places.map((place) => ({
    opens: place.opensAt ? parseClock(place.opensAt) : null,
    closes: place.closesAt ? parseClock(place.closesAt) : null,
  }))
  const withHours = hours.filter(
    (item): item is { opens: number; closes: number } => item.opens !== null && item.closes !== null,
  )
  const allClose = places.length > 0 && withHours.length === places.length
  let start = allClose ? Infinity : DEFAULT_RANGE.start
  let end = allClose ? -Infinity : DEFAULT_RANGE.end
  for (const item of withHours) {
    start = Math.min(start, Math.floor(item.opens / 60) * 60)
    end = Math.max(end, Math.ceil(item.closes / 60) * 60)
  }
  for (const group of groups) {
    start = Math.min(start, Math.floor(group.arrival / 60) * 60)
    end = Math.max(end, Math.floor(group.arrival / 60) * 60 + 60)
  }
  return { start, end }
}

export interface HourCell {
  planned: number
  groups: number
  arrived: number
}

export interface DayTotals {
  planned: number
  groups: number
  arrived: number
  /** Personas planeadas cuya hora de llegada ya pasó. */
  due: number
}

export function cellKey(date: ISODate, hour: number): string {
  return `${date}|${hour}`
}

/** Personas que llegan por día y por hora (por hora de llegada). */
export function aggregate(groups: readonly ArrivalGroup[], range: HourRange) {
  const cells = new Map<string, HourCell>()
  const days = new Map<ISODate, DayTotals>()
  let maxCell = 0
  let maxDay = 0

  for (const group of groups) {
    const hour = Math.min(Math.max(Math.floor(group.arrival / 60) * 60, range.start), range.end - 60)
    const key = cellKey(group.date, hour)
    const cell = cells.get(key) ?? { planned: 0, groups: 0, arrived: 0 }
    cell.planned += group.groupSize
    cell.groups += 1
    if (group.status === 'arrived') cell.arrived += group.groupSize
    cells.set(key, cell)
    maxCell = Math.max(maxCell, cell.planned)

    const day = days.get(group.date) ?? { planned: 0, groups: 0, arrived: 0, due: 0 }
    day.planned += group.groupSize
    day.groups += 1
    if (group.status === 'arrived') day.arrived += group.groupSize
    if (group.status !== 'upcoming') day.due += group.groupSize
    days.set(group.date, day)
    maxDay = Math.max(maxDay, day.planned)
  }
  return { cells, days, maxCell, maxDay }
}

/** 0 = vacío … 5 = lo más lleno de la vista. */
export function intensity(value: number, max: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value <= 0 || max <= 0) return 0
  const ratio = value / max
  if (ratio < 0.2) return 1
  if (ratio < 0.4) return 2
  if (ratio < 0.6) return 3
  if (ratio < 0.85) return 4
  return 5
}

/** Grupos presentes en la franja `[from, to)`: su estancia se cruza con ella. */
export function presentDuring(groups: readonly ArrivalGroup[], date: ISODate, from: number, to: number): ArrivalGroup[] {
  return groups.filter((group) => group.date === date && group.arrival < to && group.departure > from)
}

export function circuitLabel(circuitId: string, circuits: readonly Circuit[] | undefined): string {
  if (isUserCircuit(circuitId)) return 'Itinerario armado por turistas'
  return circuits?.find((circuit) => circuit.id === circuitId)?.shortTitle ?? circuitId
}

export interface DropSummary {
  total: number
  reasons: { reason: DropReason; label: string; count: number }[]
}

export function summarizeDrops(events: readonly VisitEvent[]): DropSummary {
  const counts = new Map<DropReason, number>()
  for (const event of events) {
    if (event.type === 'stop_dropped') counts.set(event.reason, (counts.get(event.reason) ?? 0) + 1)
  }
  const reasons = [...counts.entries()]
    .map(([reason, count]) => ({ reason, label: DROP_REASONS[reason], count }))
    .sort((a, b) => b.count - a.count)
  return { total: reasons.reduce((sum, item) => sum + item.count, 0), reasons }
}

/** Check-ins sin un viaje en curso: el turista escaneó el QR por su cuenta. */
export function countLooseCheckIns(events: readonly VisitEvent[]): number {
  return events.filter((event) => event.type === 'check_in' && event.circuitId === null).length
}
