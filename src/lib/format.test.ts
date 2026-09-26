import { describe, expect, it } from 'vitest'
import {
  formatDateSpan,
  formatDistance,
  formatDuration,
  formatMoney,
  formatPeople,
  formatRelativeDay,
  formatTimeRange,
  formatWaiting,
  formatWeekdayDate,
} from './format'

describe('formatos de la app', () => {
  it('duración y franja horaria', () => {
    expect(formatDuration(260)).toBe('4 h 20 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(180)).toBe('3 h')
    expect(formatTimeRange(510, 540)).toBe('8:30 – 9:00 a.m.')
    expect(formatTimeRange(700, 730)).toBe('11:40 a.m. – 12:10 p.m.')
  })

  it('dinero, distancia y personas', () => {
    expect(formatMoney(250)).toBe('C$ 250')
    expect(formatMoney(12450)).toBe('C$ 12,450')
    expect(formatDistance(0.8)).toBe('800 m')
    expect(formatDistance(2.24)).toBe('2.2 km')
    expect(formatPeople(1)).toBe('1 persona')
    expect(formatPeople(4)).toBe('4 personas')
  })

  it('tiempo de espera', () => {
    expect(formatWaiting(20)).toBe('menos de 1 h')
    expect(formatWaiting(5 * 60 + 10)).toBe('5 h')
    expect(formatWaiting(1440)).toBe('1 día')
    expect(formatWaiting(4 * 1440 + 90)).toBe('4 días')
  })

  it('fechas', () => {
    expect(formatWeekdayDate('2026-09-26')).toBe('Sábado 26 sep')
    expect(formatRelativeDay('2026-09-26', '2026-09-25')).toBe('Mañana')
    expect(formatDateSpan('2026-09-21', '2026-09-27')).toBe('21 – 27 sep')
    expect(formatDateSpan('2026-09-28', '2026-10-04')).toBe('28 sep – 4 oct')
  })
})
