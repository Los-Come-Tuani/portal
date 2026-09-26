import { describe, expect, it } from 'vitest'
import circuitsJson from '@/data/mock/json/circuits.json'
import stopsJson from '@/data/mock/json/stops.json'
import type { Circuit, Stop } from '@/data/models'
import { formatDuration, formatTime, formatTimeRange } from './format'
import { legLabel, planItinerary, visitMinutes } from './itinerary'
import { parseClock } from './time'

const stops = stopsJson as Stop[]
const circuits = circuitsJson as Circuit[]

function circuit(id: string): Circuit {
  const found = circuits.find((item) => item.id === id)
  if (!found) throw new Error(`no existe ${id}`)
  return found
}

function stopsOf(value: Circuit): Stop[] {
  return value.stopIds.map((id) => {
    const found = stops.find((stop) => stop.id === id)
    if (!found) throw new Error(`no existe ${id}`)
    return found
  })
}

function plan(id: string, start: string) {
  const value = circuit(id)
  return planItinerary({
    stops: stopsOf(value),
    start: parseClock(start) ?? 0,
    mode: value.travelMode,
    legMinutes: value.legMinutes,
  })
}

describe('planificador (valores del test de la app)', () => {
  it('Granada a pie desde las 8:30 termina a las 12:50', () => {
    const itinerary = plan('granada-historias-sabores', '8:30 a.m.')
    expect(itinerary.stops.map((stop) => formatTimeRange(stop.arrival, stop.departure))).toEqual([
      '8:30 – 9:00 a.m.',
      '9:00 – 9:25 a.m.',
      '9:35 – 10:15 a.m.',
      '10:25 – 11:00 a.m.',
      '11:10 – 11:40 a.m.',
      '12:10 – 12:50 p.m.',
    ])
    expect(itinerary.totalMinutes).toBe(260)
    expect(legLabel(itinerary.stops[1].leg!)).toBe('A pasos')
    expect(legLabel(itinerary.stops[2].leg!)).toBe('10 min a pie')
  })

  it('avisa del tramo largo a pie hacia el Muelle', () => {
    const itinerary = plan('granada-historias-sabores', '8:30 a.m.')
    expect(itinerary.warnings).toHaveLength(1)
    expect(itinerary.warnings[0].kind).toBe('longWalk')
    expect(itinerary.warnings[0].stopId).toBe('granada-muelle')
    expect(itinerary.warnings[0].message).toContain('2.2 km a pie')
  })

  it('el ferry de Ometepe desembarca en Moyogalpa sin traslado', () => {
    const itinerary = plan('isla-de-ometepe', '6:00 a.m.')
    const moyogalpa = itinerary.stops.find((stop) => stop.stop.id === 'ometepe-moyogalpa')!
    expect(moyogalpa.leg?.kind).toBe('fixed')
    expect(legLabel(moyogalpa.leg!)).toBe('Sin traslado')
    expect(formatTimeRange(moyogalpa.arrival, moyogalpa.departure)).toBe('7:00 – 7:30 a.m.')
    expect(itinerary.stops[2].leg?.kind).toBe('vehicle')
    expect(formatTime(itinerary.end)).toBe('3:50 p.m.')
    expect(itinerary.warnings).toHaveLength(0)
  })

  it('avisa si se llega a León antes de que abra la Catedral', () => {
    const itinerary = plan('leon-colonial', '7:00 a.m.')
    const warning = itinerary.warnings.find((item) => item.kind === 'closed')!
    expect(warning.stopId).toBe('leon-catedral')
    expect(warning.message).toContain('abre a las 8:00 a.m.')
  })

  it('el ritmo cambia el tiempo en cada parada', () => {
    const catedral = stops.find((stop) => stop.id === 'granada-catedral')!
    expect(visitMinutes(catedral, 'balanced')).toBe(30)
    expect(visitMinutes(catedral, 'relaxed')).toBe(50)
    expect(visitMinutes(catedral, 'intense')).toBe(25)
  })

  it('la duración publicada de cada circuito coincide con el cálculo', () => {
    for (const value of circuits) {
      for (const startTime of value.startTimes) {
        const itinerary = plan(value.id, startTime)
        expect(formatDuration(itinerary.totalMinutes), value.id).toBe(value.duration)
        expect(
          itinerary.warnings.filter((warning) => warning.kind !== 'longWalk'),
          `${value.id} a las ${startTime}`,
        ).toHaveLength(0)
      }
    }
  })
})
