import { describe, expect, it } from 'vitest'
import circuitsJson from '@/data/mock/json/circuits.json'
import portalCircuitsJson from '@/data/mock/json/portal_circuits.json'
import portalStopsJson from '@/data/mock/json/portal_stops.json'
import stopsJson from '@/data/mock/json/stops.json'
import type { MockStop as Stop } from '@/data/mock/db'
import { circuitKind, type Circuit } from '@/data/models'
import { badgesNoteText, checkStartTimes, deriveCircuit, durationShortText } from './circuits'

const stops = stopsJson as Stop[]
const circuits = circuitsJson as Circuit[]

function derive(value: Circuit) {
  return deriveCircuit({
    stops: value.stopIds.map((id) => stops.find((stop) => stop.id === id) as Stop),
    travelMode: value.travelMode,
    legMinutes: value.legMinutes,
    kind: circuitKind(value),
    bonusBadges: 0,
    city: value.city,
  })
}

describe('campos calculados del circuito', () => {
  it('reproduce la duración y el texto corto publicados', () => {
    for (const value of circuits) {
      const derived = derive(value)
      expect(derived.duration, value.id).toBe(value.duration)
      expect(derived.durationShort, value.id).toBe(value.durationShort)
    }
  })

  it('cuenta las insignias de sus paradas y arma la nota como la app', () => {
    for (const value of circuits.filter((item) => item.id !== 'isla-de-ometepe')) {
      const derived = derive(value)
      expect(derived.badges, value.id).toBe(value.badges)
      expect(derived.badgesNote, value.id).toBe(value.badgesNote)
    }
  })

  it('en Ometepe cuenta 3 insignias, no las 4 que dicen los datos', () => {
    expect(derive(circuits.find((item) => item.id === 'isla-de-ometepe') as Circuit).badges).toBe(3)
  })

  it('un especial de K\'Plan suma sus insignias extra a la nota', () => {
    expect(badgesNoteText({ badges: 2, kind: 'kplan', bonusBadges: 4, city: 'Granada' })).toBe(
      'Este recorrido contiene un total de 2 insignias coleccionables, más 4 insignias extra de "Circuitos K\'Plan" al completarlo',
    )
    expect(badgesNoteText({ badges: 2, kind: 'kplan', bonusBadges: 1, city: 'Granada' })).toContain('más 1 insignia extra de')
  })

  it('redondea la duración corta y pasa a un día desde 8 h', () => {
    expect(durationShortText(260)).toBe('4 h aprox.')
    expect(durationShortText(405)).toBe('7 h aprox.')
    expect(durationShortText(480)).toBe('1 día')
    expect(durationShortText(20)).toBe('1 h aprox.')
  })

  it("los especiales de K'Plan de la demo salen sin avisos de horario", () => {
    const all = [...stops, ...(portalStopsJson as Stop[])]
    for (const value of portalCircuitsJson as Circuit[]) {
      const circuitStops = value.stopIds.map((id) => all.find((stop) => stop.id === id) as Stop)
      expect(circuitStops.every((stop) => stop?.city === value.city), value.id).toBe(true)
      for (const check of checkStartTimes({ stops: circuitStops, travelMode: value.travelMode }, value.startTimes)) {
        expect(check.blocking, `${value.id} a las ${check.startTime}`).toHaveLength(0)
      }
    }
  })

  it('marca las horas de salida con avisos de horario, pero no el tramo largo a pie', () => {
    const leon = circuits.find((item) => item.id === 'leon-colonial') as Circuit
    const leonStops = leon.stopIds.map((id) => stops.find((stop) => stop.id === id) as Stop)
    const [early, published] = checkStartTimes({ stops: leonStops, travelMode: leon.travelMode }, ['7:00 a.m.', '9:00 a.m.'])
    expect(early.blocking.map((warning) => warning.stopId)).toContain('leon-catedral')
    expect(published.blocking).toHaveLength(0)

    const granada = circuits.find((item) => item.id === 'granada-historias-sabores') as Circuit
    const granadaStops = granada.stopIds.map((id) => stops.find((stop) => stop.id === id) as Stop)
    const [check] = checkStartTimes({ stops: granadaStops, travelMode: granada.travelMode }, ['8:30 a.m.'])
    expect(check.warnings).toHaveLength(1)
    expect(check.blocking).toHaveLength(0)
  })
})
