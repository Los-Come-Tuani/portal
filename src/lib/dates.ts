/**
 * Fechas sin zona horaria, como las guarda la app: `YYYY-MM-DD` y
 * `YYYY-MM-DDTHH:mm:ss.000`, siempre en hora de Nicaragua (UTC−6, sin
 * horario de verano). La aritmética se hace en UTC para no depender de la
 * zona del navegador.
 */

export type ISODate = string
export type LocalDateTime = string

const TIME_ZONE = 'America/Managua'
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const dateInManagua = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeInManagua = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function todayISO(now: Date = new Date()): ISODate {
  return dateInManagua.format(now)
}

/** Minutos desde la medianoche en Managua. */
export function nowMinutes(now: Date = new Date()): number {
  const [hours, minutes] = timeInManagua.format(now).split(':').map(Number)
  return hours * 60 + minutes
}

export function nowLocalDateTime(now: Date = new Date()): LocalDateTime {
  return toLocalDateTime(todayISO(now), nowMinutes(now))
}

export function isISODate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  return fromUTC(toUTC(value)) === value
}

function toUTC(date: ISODate): Date {
  return new Date(`${date}T00:00:00Z`)
}

function fromUTC(date: Date): ISODate {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: ISODate, days: number): ISODate {
  const value = toUTC(date)
  value.setUTCDate(value.getUTCDate() + days)
  return fromUTC(value)
}

/** Días de `from` a `to`: `diffDays('2026-09-25', '2026-09-27')` → 2. */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000)
}

/** 0 = lunes … 6 = domingo. */
export function weekdayIndex(date: ISODate): number {
  return (toUTC(date).getUTCDay() + 6) % 7
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekdayIndex(date))
}

/** Los siete días, de lunes a domingo, de la semana de `date`. */
export function weekDates(date: ISODate): ISODate[] {
  const monday = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

/** `"2026-09"` */
export function monthKey(date: ISODate): string {
  return date.slice(0, 7)
}

export function addMonths(key: string, months: number): string {
  const [year, month] = key.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1 + months, 1))
  return fromUTC(value).slice(0, 7)
}

export function daysInMonth(key: string): number {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Las semanas (de lunes a domingo) que cubren el mes, para un calendario. */
export function monthGrid(key: string): ISODate[][] {
  const first = `${key}-01`
  const last = `${key}-${String(daysInMonth(key)).padStart(2, '0')}`
  const weeks: ISODate[][] = []
  for (let monday = startOfWeek(first); monday <= last; monday = addDays(monday, 7)) {
    weeks.push(weekDates(monday))
  }
  return weeks
}

export function isBetween(date: ISODate, from: ISODate, to: ISODate): boolean {
  return date >= from && date <= to
}

/** `('2026-09-26', 540)` → `"2026-09-26T09:00:00.000"` */
export function toLocalDateTime(date: ISODate, minutes: number): LocalDateTime {
  const day = addDays(date, Math.floor(minutes / 1440))
  const rest = ((minutes % 1440) + 1440) % 1440
  const hours = String(Math.floor(rest / 60)).padStart(2, '0')
  const mins = String(rest % 60).padStart(2, '0')
  return `${day}T${hours}:${mins}:00.000`
}

/** Minutos de `from` a `to`, las dos en hora de Managua. */
export function minutesBetween(from: LocalDateTime, to: LocalDateTime): number {
  const start = splitLocalDateTime(from)
  const end = splitLocalDateTime(to)
  return diffDays(start.date, end.date) * 1440 + end.minutes - start.minutes
}

export function splitLocalDateTime(value: LocalDateTime): { date: ISODate; minutes: number } {
  const date = value.slice(0, 10)
  const hours = Number(value.slice(11, 13))
  const minutes = Number(value.slice(14, 16))
  return { date, minutes: hours * 60 + minutes }
}
