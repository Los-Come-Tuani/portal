/**
 * Horas y duraciones como texto, con las mismas reglas que la app
 * (mobile/lib/src/core/utils/time_parser.dart). Si la app no entiende un
 * valor lo ignora en silencio, por eso el portal valida con estas funciones.
 */

const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/
const HOURS_PATTERN = /(\d+)\s*h/
const MINUTES_PATTERN = /(\d+)\s*min/
const INPUT_TIME_PATTERN = /^(\d{2}):(\d{2})$/

/** `"3:00 p.m."` → 900 minutos desde la medianoche; `null` si no es una hora. */
export function parseClock(text: string): number | null {
  const match = CLOCK_PATTERN.exec(text.trim().toLowerCase())
  if (!match) return null
  const hour = (Number(match[1]) % 12) + (match[3] === 'p' ? 12 : 0)
  return hour * 60 + Number(match[2])
}

/** `"1 h 30 min"` → 90. 0 si el texto no trae horas ni minutos (p. ej. `"1 día"`). */
export function parseDuration(text: string): number {
  const lower = text.toLowerCase()
  const hours = Number(HOURS_PATTERN.exec(lower)?.[1] ?? 0)
  const minutes = Number(MINUTES_PATTERN.exec(lower)?.[1] ?? 0)
  return hours * 60 + minutes
}

/** Forma canónica que escribe el portal: 510 → `"8:30 a.m."`. */
export function toClock(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24
  const minute = minutes % 60
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'a.m.' : 'p.m.'}`
}

/** Forma canónica de una duración: 90 → `"1 h 30 min"`. */
export function toDurationText(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

/** `"8:30 a.m."` → `"08:30"`, el valor de un `<input type="time">`. */
export function clockToInput(clock: string | undefined): string {
  const minutes = clock ? parseClock(clock) : null
  if (minutes === null) return ''
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** `"08:30"` → `"8:30 a.m."`; `undefined` si el campo está vacío. */
export function inputToClock(value: string): string | undefined {
  const match = INPUT_TIME_PATTERN.exec(value)
  if (!match) return undefined
  return toClock(Number(match[1]) * 60 + Number(match[2]))
}
