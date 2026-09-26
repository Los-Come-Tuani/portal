/**
 * Formatos de presentación en un solo lugar, iguales a los de la app
 * (mobile/lib/src/core/utils/formatters.dart) para que el portal y la app
 * se lean igual.
 */
import { diffDays, splitLocalDateTime, weekdayIndex, type ISODate, type LocalDateTime } from './dates'
import { toClock, toDurationText } from './time'

export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const WEEKDAYS_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

const integer = new Intl.NumberFormat('es-NI', { maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('es-NI', { style: 'percent', maximumFractionDigits: 0 })

/** `1500` → `C$ 1,500`, sin decimales. */
export function formatMoney(value: number): string {
  return `C$ ${integer.format(Math.round(value))}`
}

export function formatNumber(value: number): string {
  return integer.format(value)
}

/** `0.82` → `82 %` */
export function formatPercent(ratio: number): string {
  return percent.format(ratio)
}

/** Minutos desde la medianoche: 900 → `3:00 p.m.` */
export function formatTime(minutes: number): string {
  return toClock(minutes)
}

/** Sólo la hora, para ejes: 540 → `9 a.m.`, 750 → `12:30 p.m.` */
export function formatHour(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24
  const minute = minutes % 60
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 ? 'a.m.' : 'p.m.'
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

/**
 * Franja horaria. Si las dos horas caen del mismo lado del mediodía, el
 * sufijo va una sola vez: `8:30 – 9:00 a.m.`, pero `11:40 a.m. – 12:10 p.m.`.
 */
export function formatTimeRange(from: number, to: number): string {
  const sameDay = Math.floor(from / 1440) === Math.floor(to / 1440)
  const sameHalf = sameDay && from % 1440 < 720 === to % 1440 < 720
  if (!sameHalf) return `${formatTime(from)} – ${formatTime(to)}`
  return `${formatTime(from).replace(/ [ap]\.m\.$/, '')} – ${formatTime(to)}`
}

/** 260 → `4 h 20 min`; también `45 min` o `3 h`. */
export function formatDuration(minutes: number): string {
  return toDurationText(minutes)
}

/** `0.8` → `800 m`, `2.24` → `2.2 km`. */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`
}

/** `1` → `1 persona`, `4` → `4 personas`. */
export function formatPeople(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'persona' : 'personas'}`
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
}

function parts(date: ISODate) {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

/** `2026-11-16` → `16 nov` (también el `dateLabel` de los eventos). */
export function formatDayMonth(date: ISODate): string {
  const { month, day } = parts(date)
  return `${day} ${MONTHS_SHORT[month - 1]}`
}

/** `2026-11-16` → `16 nov 2026` */
export function formatDate(date: ISODate): string {
  const { year } = parts(date)
  return `${formatDayMonth(date)} ${year}`
}

/** `2026-09-26` → `Sábado 26 sep` */
export function formatWeekdayDate(date: ISODate): string {
  return `${WEEKDAYS[weekdayIndex(date)]} ${formatDayMonth(date)}`
}

/** `Hoy`, `Mañana`, `Ayer` o `Sábado 26 sep`. */
export function formatRelativeDay(date: ISODate, today: ISODate): string {
  const offset = diffDays(today, date)
  if (offset === 0) return 'Hoy'
  if (offset === 1) return 'Mañana'
  if (offset === -1) return 'Ayer'
  return formatWeekdayDate(date)
}

/** `2026-09` → `septiembre 2026` */
export function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return `${MONTHS_LONG[month - 1]} ${year}`
}

/** `2026-09-21`…`2026-09-27` → `21 – 27 sep`; cruzando meses, `28 sep – 4 oct`. */
export function formatDateSpan(from: ISODate, to: ISODate): string {
  const start = parts(from)
  const end = parts(to)
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} – ${end.day} ${MONTHS_SHORT[end.month - 1]}`
  }
  return `${formatDayMonth(from)} – ${formatDayMonth(to)}`
}

/** `2026-09-26T09:12:00.000` → `26 sep, 9:12 a.m.` */
export function formatDateTime(value: LocalDateTime): string {
  const { date, minutes } = splitLocalDateTime(value)
  return `${formatDayMonth(date)}, ${formatTime(minutes)}`
}
