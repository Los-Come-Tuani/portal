import { describe, expect, it } from 'vitest'
import { clockToInput, inputToClock, parseClock, parseDuration, toClock, toDurationText } from './time'

describe('parseClock', () => {
  it('lee horas con a.m. y p.m. como la app', () => {
    expect(parseClock('8:30 a.m.')).toBe(510)
    expect(parseClock('3:00 p.m.')).toBe(900)
    expect(parseClock('12:30 p.m.')).toBe(750)
    expect(parseClock('12:05 a.m.')).toBe(5)
    expect(parseClock('8:30 AM')).toBe(510)
    expect(parseClock('mediodía')).toBeNull()
  })
})

describe('parseDuration', () => {
  it('lee duraciones en horas y minutos', () => {
    expect(parseDuration('1 h 30 min')).toBe(90)
    expect(parseDuration('45 min')).toBe(45)
    expect(parseDuration('2 h')).toBe(120)
    expect(parseDuration('1 día')).toBe(0)
  })
})

describe('forma canónica', () => {
  it('escribe horas y duraciones como las lee la app', () => {
    expect(toClock(510)).toBe('8:30 a.m.')
    expect(toClock(720)).toBe('12:00 p.m.')
    expect(toClock(5)).toBe('12:05 a.m.')
    expect(toDurationText(90)).toBe('1 h 30 min')
    expect(toDurationText(120)).toBe('2 h')
    expect(toDurationText(45)).toBe('45 min')
  })

  it('convierte desde y hacia <input type="time">', () => {
    expect(clockToInput('8:30 a.m.')).toBe('08:30')
    expect(clockToInput('3:05 p.m.')).toBe('15:05')
    expect(clockToInput(undefined)).toBe('')
    expect(inputToClock('15:05')).toBe('3:05 p.m.')
    expect(inputToClock('')).toBeUndefined()
  })
})
