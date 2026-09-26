import { describe, expect, it } from 'vitest'
import type { VisitEvent } from '@/data/models'
import { aggregate, buildGroups, hourRange, intensity, presentDuring, summarizeDrops } from './agenda'

const planned = (bookingId: string, arrival: string, departure: string, groupSize = 4): VisitEvent => ({
  type: 'planned_visit',
  stopId: 'granada-cocina-dona-tere',
  circuitId: 'user-circuit-abc',
  bookingId,
  arrival,
  departure,
  groupSize,
  recordedAt: '2026-09-20T10:00:00.000',
})

describe('buildGroups', () => {
  const events: VisitEvent[] = [
    planned('b1', '2026-09-24T12:10:00.000', '2026-09-24T13:10:00.000'),
    {
      type: 'check_in',
      stopId: 'granada-cocina-dona-tere',
      circuitId: 'user-circuit-abc',
      groupSize: 4,
      recordedAt: '2026-09-24T12:22:00.000',
    },
    planned('b2', '2026-09-24T15:00:00.000', '2026-09-24T16:00:00.000', 2),
    planned('b3', '2026-09-25T12:00:00.000', '2026-09-25T13:00:00.000', 3),
    planned('b4', '2026-09-25T15:30:00.000', '2026-09-25T16:30:00.000', 5),
  ]

  it('cruza el check-in con su visita planeada', () => {
    const groups = buildGroups(events, '2026-09-25', 12 * 60 + 30)
    expect(groups[0].status).toBe('arrived')
    expect(groups[0].checkedInAt).toBe(12 * 60 + 22)
  })

  it('sin check-in, lo pasado queda sin confirmar y lo de ahora, llegando', () => {
    const groups = buildGroups(events, '2026-09-25', 12 * 60 + 30)
    expect(groups.map((group) => group.status)).toEqual(['arrived', 'unconfirmed', 'arriving', 'upcoming'])
  })

  it('suma personas por día y por hora', () => {
    const groups = buildGroups(events, '2026-09-25', 12 * 60 + 30)
    const { cells, days, maxCell } = aggregate(groups, hourRange(groups))
    expect(days.get('2026-09-24')).toEqual({ planned: 6, groups: 2, arrived: 4, due: 6 })
    expect(cells.get('2026-09-25|720')?.planned).toBe(3)
    expect(maxCell).toBe(5)
  })

  it('la agenda sigue el horario del lugar', () => {
    const groups = buildGroups(events, '2026-09-25', 0)
    expect(hourRange(groups, [{ opensAt: '11:00 a.m.', closesAt: '9:00 p.m.' }])).toEqual({ start: 660, end: 1260 })
    expect(hourRange(groups, [{}])).toEqual({ start: 420, end: 1140 })
  })

  it('cuenta quién está presente en una franja', () => {
    const groups = buildGroups(events, '2026-09-25', 0)
    expect(presentDuring(groups, '2026-09-24', 13 * 60, 14 * 60)).toHaveLength(1)
  })
})

describe('intensity y abandonos', () => {
  it('reparte la intensidad en cinco niveles', () => {
    expect(intensity(0, 10)).toBe(0)
    expect(intensity(1, 10)).toBe(1)
    expect(intensity(10, 10)).toBe(5)
  })

  it('ordena las razones de abandono', () => {
    const summary = summarizeDrops([
      { type: 'stop_dropped', stopId: 'x', circuitId: 'c', reason: 'closed', stage: 'trip', recordedAt: '2026-09-20T10:00:00.000' },
      { type: 'stop_dropped', stopId: 'x', circuitId: 'c', reason: 'closed', stage: 'trip_ended', recordedAt: '2026-09-21T10:00:00.000' },
      { type: 'stop_dropped', stopId: 'x', circuitId: 'c', reason: 'weather', stage: 'trip', recordedAt: '2026-09-22T10:00:00.000' },
    ])
    expect(summary.total).toBe(3)
    expect(summary.reasons[0]).toMatchObject({ reason: 'closed', count: 2, label: 'Estaba cerrado' })
  })
})
