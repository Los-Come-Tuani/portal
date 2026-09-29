import { ApiError } from '@/data/api/errors'
import { bonusBadgesOf, bookingModeOf, circuitKind, type Circuit, type CircuitInput } from '@/data/models'
import { circuitInputSchema } from '@/data/schemas/circuit.schema'

export type CircuitErrors = Partial<Record<keyof CircuitInput | string, string>>

/** 0,0 es "sin punto de encuentro", como en la app. */
export const NO_LOCATION = { latitude: 0, longitude: 0 }

export function hasLocation(location: CircuitInput['location']): boolean {
  return location.latitude !== 0 || location.longitude !== 0
}

export function emptyCircuit(): CircuitInput {
  return {
    kind: 'kplan',
    title: '',
    shortTitle: '',
    subtitle: '',
    category: 'Ciudad',
    city: 'Granada',
    difficulty: 'Fácil',
    stopIds: [],
    travelMode: 'walking',
    startTimes: ['9:00 a.m.'],
    priceAdult: 0,
    priceChild: 0,
    description: '',
    images: [],
    recommendations: '',
    meetingPoint: '',
    location: NO_LOCATION,
    includes: '',
    notes: '',
    organizer: '',
    bonusBadges: 3,
    bookingMode: 'private',
    availableFrom: null,
    availableUntil: null,
    draft: true,
  }
}

export function toCircuitInput(circuit: Circuit): CircuitInput {
  const kind = circuitKind(circuit)
  return {
    kind,
    title: circuit.title,
    shortTitle: circuit.shortTitle,
    subtitle: circuit.subtitle,
    category: circuit.category,
    city: circuit.city,
    difficulty: circuit.difficulty,
    stopIds: [...circuit.stopIds],
    travelMode: circuit.travelMode,
    ...(circuit.legMinutes ? { legMinutes: { ...circuit.legMinutes } } : {}),
    startTimes: [...circuit.startTimes],
    priceAdult: circuit.priceAdult,
    priceChild: circuit.priceChild,
    description: circuit.description,
    images: [...circuit.images],
    recommendations: circuit.recommendations,
    meetingPoint: circuit.meetingPoint,
    location: { ...circuit.location },
    includes: circuit.includes,
    notes: circuit.notes,
    organizer: circuit.organizer ?? '',
    bonusBadges: kind === 'kplan' ? bonusBadgesOf(circuit) : 3,
    bookingMode: bookingModeOf(circuit),
    availableFrom: circuit.availableFrom ?? null,
    availableUntil: circuit.availableUntil ?? null,
    draft: circuit.draft ?? false,
  }
}

/** Los errores del formulario por campo: primero los de Zod, y si pasa, los del servidor. */
export function validateCircuit(input: CircuitInput): { data: CircuitInput | null; errors: CircuitErrors } {
  const result = circuitInputSchema.safeParse(input)
  if (result.success) return { data: result.data as CircuitInput, errors: {} }
  const errors: CircuitErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '')
    if (!(key in errors)) errors[key] = issue.message
  }
  return { data: null, errors }
}

export function serverErrors(error: unknown): CircuitErrors | null {
  if (!(error instanceof ApiError) || Object.keys(error.fieldErrors).length === 0) return null
  return error.fieldErrors
}
